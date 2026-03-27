import { z } from "zod";
import { eq, and, desc, lte, gte, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../index";
import { evidence, evidenceLinks, tasks } from "@/server/db/schema";
import { getUploadUrl, getPublicUrl } from "@/server/services/storage";
import { suggestTasks } from "@/server/services/ai-linker";
import crypto from "crypto";

export const evidenceRouter = createTRPCRouter({
  getUploadUrl: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        filename: z.string().min(1),
        contentType: z.string().min(1),
        fileSizeBytes: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const evidenceId = crypto.randomUUID();
      const ext = input.filename.split(".").pop() ?? "";
      const storageKey = `projects/${input.projectId}/evidence/${evidenceId}/${input.filename}`;
      const result = await getUploadUrl(storageKey, input.contentType);
      return {
        ...result,
        evidenceId,
      };
    }),

  confirm: publicProcedure
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
      const type = input.mimeType.startsWith("video/") ? "video" : "photo";

      const [record] = await ctx.db
        .insert(evidence)
        .values({
          projectId: input.projectId,
          uploadedBy: "00000000-0000-0000-0000-000000000001", // TODO: Get from auth
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
      return record;
    }),

  list: publicProcedure
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
      // Build conditions
      const conditions = [eq(evidence.projectId, input.projectId)];

      if (input.dateFrom) {
        conditions.push(gte(evidence.capturedAt, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        conditions.push(lte(evidence.capturedAt, new Date(input.dateTo)));
      }

      // If filtering by task, get evidence IDs linked to that task
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

      // Cursor condition
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

      // Apply task filter in-memory if needed
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

  link: publicProcedure
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
      return link ?? { alreadyLinked: true };
    }),

  unlink: publicProcedure
    .input(
      z.object({
        evidenceId: z.string().uuid(),
        taskId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(evidenceLinks)
        .where(
          and(
            eq(evidenceLinks.evidenceId, input.evidenceId),
            eq(evidenceLinks.taskId, input.taskId)
          )
        );
      return { success: true };
    }),

  suggest: publicProcedure
    .input(z.object({ evidenceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.evidence.findFirst({
        where: eq(evidence.id, input.evidenceId),
      });
      if (!item) throw new Error("Evidence not found");

      return suggestTasks(ctx.db, {
        latitude: item.latitude,
        longitude: item.longitude,
        capturedAt: item.capturedAt,
        projectId: item.projectId,
      });
    }),
});
