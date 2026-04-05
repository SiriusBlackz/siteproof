import { z } from "zod";
import { eq, and, desc, lte, gte, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../index";
import { evidence, evidenceLinks, tasks } from "@/server/db/schema";
import { getUploadUrl, getPublicUrl } from "@/server/services/storage";
import { suggestTasks } from "@/server/services/ai-linker";
import { assertProjectAccess } from "../helpers";
import { writeAuditLog } from "@/server/services/audit";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export const evidenceRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        filename: z.string().min(1).max(255),
        contentType: z.enum(ALLOWED_MIME_TYPES, {
          error: "File type not allowed. Accepted: JPEG, PNG, WebP, HEIC, MP4, MOV, WebM",
        }),
        fileSizeBytes: z.number().positive().max(MAX_FILE_SIZE_BYTES, {
          error: `File size must be under ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`,
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId);
      const evidenceId = crypto.randomUUID();
      const storageKey = `projects/${input.projectId}/evidence/${evidenceId}/${input.filename}`;
      const result = await getUploadUrl(storageKey, input.contentType);
      return { ...result, evidenceId };
    }),

  confirm: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        storageKey: z.string().min(1),
        originalFilename: z.string().min(1),
        fileSizeBytes: z.number().positive(),
        mimeType: z.string().min(1),
        capturedAt: z.string().nullable().optional(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        altitude: z.number().nullable().optional(),
        exifData: z.record(z.string(), z.unknown()).nullable().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId);
      const type = input.mimeType.startsWith("video/") ? "video" : "photo";

      const [record] = await ctx.db
        .insert(evidence)
        .values({
          projectId: input.projectId,
          uploadedBy: ctx.userId,
          type,
          storageKey: input.storageKey,
          originalFilename: input.originalFilename,
          fileSizeBytes: input.fileSizeBytes,
          mimeType: input.mimeType,
          capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          altitude: input.altitude ?? null,
          exifData: input.exifData ?? null,
          note: input.note,
        })
        .returning();
      writeAuditLog(ctx.db, { projectId: input.projectId, userId: ctx.userId, action: "upload", entityType: "evidence", entityId: record.id, metadata: { filename: input.originalFilename } });
      return record;
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(24),
        taskId: z.string().uuid().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId);
      const conditions = [eq(evidence.projectId, input.projectId)];

      if (input.dateFrom) {
        conditions.push(gte(evidence.capturedAt, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        conditions.push(lte(evidence.capturedAt, new Date(input.dateTo)));
      }

      let evidenceIdsForTask: string[] | null = null;
      if (input.taskId) {
        const links = await ctx.db.query.evidenceLinks.findMany({
          where: eq(evidenceLinks.taskId, input.taskId),
          columns: { evidenceId: true },
        });
        evidenceIdsForTask = links.map((l) => l.evidenceId);
        if (evidenceIdsForTask.length === 0) {
          return { items: [], nextCursor: null };
        }
      }

      if (input.cursor) {
        const cursorRecord = await ctx.db.query.evidence.findFirst({
          where: eq(evidence.id, input.cursor),
          columns: { createdAt: true, id: true },
        });
        if (cursorRecord?.createdAt) {
          conditions.push(lte(evidence.createdAt, cursorRecord.createdAt));
          conditions.push(sql`${evidence.id} != ${input.cursor}`);
        }
      }

      let items = await ctx.db.query.evidence.findMany({
        where: and(...conditions),
        orderBy: [desc(evidence.createdAt)],
        limit: input.limit + 1,
        with: {
          links: {
            with: {
              task: { columns: { id: true, name: true } },
            },
          },
        },
      });

      if (evidenceIdsForTask) {
        items = items.filter((e) => evidenceIdsForTask!.includes(e.id));
      }

      const hasMore = items.length > input.limit;
      if (hasMore) items = items.slice(0, input.limit);

      return {
        items: items.map((item) => ({
          ...item,
          publicUrl: getPublicUrl(item.storageKey),
          linkedTasks: item.links.map((l) => ({
            taskId: l.task.id,
            taskName: l.task.name,
          })),
        })),
        nextCursor: hasMore ? items[items.length - 1].id : null,
      };
    }),

  link: protectedProcedure
    .input(
      z.object({
        evidenceId: z.string().uuid(),
        taskId: z.string().uuid(),
        linkMethod: z
          .enum(["manual", "ai_suggested"])
          .optional()
          .default("manual"),
        aiConfidence: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via the evidence's project
      const ev = await ctx.db.query.evidence.findFirst({
        where: eq(evidence.id, input.evidenceId),
        columns: { projectId: true },
      });
      if (!ev) throw new TRPCError({ code: "NOT_FOUND", message: "Evidence not found" });
      await assertProjectAccess(ctx.db, ev.projectId, ctx.orgId);

      const [link] = await ctx.db
        .insert(evidenceLinks)
        .values({
          evidenceId: input.evidenceId,
          taskId: input.taskId,
          linkMethod: input.linkMethod,
          aiConfidence: input.aiConfidence ?? null,
        })
        .onConflictDoNothing()
        .returning();
      if (link) writeAuditLog(ctx.db, { projectId: ev.projectId, userId: ctx.userId, action: "link", entityType: "evidence_link", entityId: link.id, metadata: { evidenceId: input.evidenceId, taskId: input.taskId } });
      return link ?? { alreadyLinked: true };
    }),

  unlink: protectedProcedure
    .input(
      z.object({
        evidenceId: z.string().uuid(),
        taskId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ev = await ctx.db.query.evidence.findFirst({
        where: eq(evidence.id, input.evidenceId),
        columns: { projectId: true },
      });
      if (!ev) throw new TRPCError({ code: "NOT_FOUND", message: "Evidence not found" });
      await assertProjectAccess(ctx.db, ev.projectId, ctx.orgId);

      await ctx.db
        .delete(evidenceLinks)
        .where(
          and(
            eq(evidenceLinks.evidenceId, input.evidenceId),
            eq(evidenceLinks.taskId, input.taskId)
          )
        );
      writeAuditLog(ctx.db, { projectId: ev.projectId, userId: ctx.userId, action: "unlink", entityType: "evidence_link", entityId: input.evidenceId, metadata: { taskId: input.taskId } });
      return { success: true };
    }),

  suggest: protectedProcedure
    .input(z.object({ evidenceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.evidence.findFirst({
        where: eq(evidence.id, input.evidenceId),
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Evidence not found" });
      await assertProjectAccess(ctx.db, item.projectId, ctx.orgId);

      return suggestTasks(ctx.db, {
        latitude: item.latitude,
        longitude: item.longitude,
        capturedAt: item.capturedAt,
        projectId: item.projectId,
      });
    }),

  /** Evidence dates grouped by task+date for the Gantt chart markers */
  markers: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId);
      const rows = await ctx.db
        .select({
          taskId: evidenceLinks.taskId,
          date: sql<string>`DATE(${evidence.capturedAt})`.as("date"),
          count: sql<number>`COUNT(*)::int`.as("count"),
        })
        .from(evidenceLinks)
        .innerJoin(evidence, eq(evidenceLinks.evidenceId, evidence.id))
        .where(
          and(
            eq(evidence.projectId, input.projectId),
            sql`${evidence.capturedAt} IS NOT NULL`
          )
        )
        .groupBy(evidenceLinks.taskId, sql`DATE(${evidence.capturedAt})`);
      return rows.map((r) => ({
        taskId: r.taskId,
        date: r.date,
        count: r.count,
      }));
    }),

  bulkLink: protectedProcedure
    .input(
      z.object({
        evidenceIds: z.array(z.string().uuid()).min(1).max(100),
        taskId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all evidence belongs to the same project and user has access
      const items = await ctx.db.query.evidence.findMany({
        where: inArray(evidence.id, input.evidenceIds),
        columns: { id: true, projectId: true },
      });
      if (items.length !== input.evidenceIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or more evidence items not found" });
      }
      const projectIds = new Set(items.map((e) => e.projectId));
      for (const pid of projectIds) {
        await assertProjectAccess(ctx.db, pid, ctx.orgId);
      }

      // Insert links, skip duplicates
      const values = input.evidenceIds.map((eid) => ({
        evidenceId: eid,
        taskId: input.taskId,
        linkMethod: "manual" as const,
      }));
      await ctx.db
        .insert(evidenceLinks)
        .values(values)
        .onConflictDoNothing();

      const projectId = items[0].projectId;
      writeAuditLog(ctx.db, {
        projectId,
        userId: ctx.userId,
        action: "bulk_link",
        entityType: "evidence_link",
        entityId: input.taskId,
        metadata: { evidenceCount: input.evidenceIds.length, taskId: input.taskId },
      });

      return { linked: input.evidenceIds.length };
    }),
});
