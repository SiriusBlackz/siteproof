import { z } from "zod";
import { eq, asc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../index";
import { tasks } from "@/server/db/schema";
import { detectAndParse } from "@/server/services/programme-import";
import { assertProjectAccess } from "../helpers";
import { writeAuditLog } from "@/server/services/audit";

interface FlatTask {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  name: string;
  description: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  progressPct: number | null;
  sortOrder: number | null;
  sourceRef: string | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  depth: number;
}

function buildTree(
  allTasks: (typeof tasks.$inferSelect)[],
): FlatTask[] {
  const childrenMap = new Map<string | null, (typeof tasks.$inferSelect)[]>();
  for (const task of allTasks) {
    const parentId = task.parentTaskId ?? null;
    const list = childrenMap.get(parentId) ?? [];
    list.push(task);
    childrenMap.set(parentId, list);
  }

  const result: FlatTask[] = [];
  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) ?? [];
    for (const child of children) {
      result.push({ ...child, depth });
      walk(child.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

export const taskRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId, ctx.userId);
      const allTasks = await ctx.db.query.tasks.findMany({
        where: eq(tasks.projectId, input.projectId),
        orderBy: [asc(tasks.sortOrder)],
      });
      return buildTree(allTasks);
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1, "Task name is required"),
        description: z.string().optional(),
        parentTaskId: z.string().uuid().nullable().optional(),
        plannedStart: z.string().optional(),
        plannedEnd: z.string().optional(),
        status: z
          .enum(["not_started", "in_progress", "completed", "delayed"])
          .optional(),
        progressPct: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId, ctx.userId);
      const parentId = input.parentTaskId ?? null;

      const [maxResult] = await ctx.db
        .select({ max: sql<number>`COALESCE(MAX(${tasks.sortOrder}), -1)` })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, input.projectId),
            parentId
              ? eq(tasks.parentTaskId, parentId)
              : sql`${tasks.parentTaskId} IS NULL`
          )
        );
      const nextSort = (maxResult?.max ?? -1) + 1;

      const [task] = await ctx.db
        .insert(tasks)
        .values({
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          parentTaskId: parentId,
          plannedStart: input.plannedStart || null,
          plannedEnd: input.plannedEnd || null,
          status: input.status ?? "not_started",
          progressPct: input.progressPct ?? 0,
          sortOrder: nextSort,
        })
        .returning();
      writeAuditLog(ctx.db, { projectId: input.projectId, userId: ctx.userId, action: "create", entityType: "task", entityId: task.id, metadata: { name: task.name } });
      return task;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        parentTaskId: z.string().uuid().nullable().optional(),
        plannedStart: z.string().nullable().optional(),
        plannedEnd: z.string().nullable().optional(),
        actualStart: z.string().nullable().optional(),
        actualEnd: z.string().nullable().optional(),
        status: z
          .enum(["not_started", "in_progress", "completed", "delayed"])
          .optional(),
        progressPct: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via the task's project
      const existing = await ctx.db.query.tasks.findFirst({
        where: eq(tasks.id, input.id),
        columns: { projectId: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      await assertProjectAccess(ctx.db, existing.projectId, ctx.orgId, ctx.userId);

      const { id, ...data } = input;
      const cleaned: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(data)) {
        cleaned[key] = val === "" ? null : val;
      }
      const [task] = await ctx.db
        .update(tasks)
        .set({ ...cleaned, updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();
      writeAuditLog(ctx.db, { projectId: existing.projectId, userId: ctx.userId, action: "update", entityType: "task", entityId: id });
      return task;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const task = await tx.query.tasks.findFirst({
          where: eq(tasks.id, input.id),
        });
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        await assertProjectAccess(ctx.db, task.projectId, ctx.orgId, ctx.userId);

        await tx
          .update(tasks)
          .set({ parentTaskId: task.parentTaskId, updatedAt: new Date() })
          .where(eq(tasks.parentTaskId, input.id));

        await tx.delete(tasks).where(eq(tasks.id, input.id));
        writeAuditLog(ctx.db, { projectId: task.projectId, userId: ctx.userId, action: "delete", entityType: "task", entityId: input.id, metadata: { name: task.name } });
        return { success: true };
      });
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        items: z.array(
          z.object({
            id: z.string().uuid(),
            sortOrder: z.number().int(),
            parentTaskId: z.string().uuid().nullable(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId, ctx.userId);
      return ctx.db.transaction(async (tx) => {
        for (const item of input.items) {
          await tx
            .update(tasks)
            .set({
              sortOrder: item.sortOrder,
              parentTaskId: item.parentTaskId,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, item.id));
        }
        return { success: true };
      });
    }),

  previewImport: protectedProcedure
    .input(z.object({ xml: z.string().min(10) }))
    .mutation(async ({ input }) => {
      return detectAndParse(input.xml);
    }),

  import: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        xml: z.string().min(10),
        clearExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId, ctx.userId);
      const { tasks: parsedTasks, format } = detectAndParse(input.xml);

      return ctx.db.transaction(async (tx) => {
        if (input.clearExisting) {
          await tx.delete(tasks).where(eq(tasks.projectId, input.projectId));
        }

        const refToId = new Map<string, string>();

        for (const pt of parsedTasks) {
          const parentTaskId = pt.parentSourceRef
            ? refToId.get(pt.parentSourceRef) ?? null
            : null;

          const [inserted] = await tx
            .insert(tasks)
            .values({
              projectId: input.projectId,
              name: pt.name,
              parentTaskId,
              plannedStart: pt.plannedStart,
              plannedEnd: pt.plannedEnd,
              progressPct: pt.progressPct,
              sortOrder: pt.sortOrder,
              sourceRef: pt.sourceRef,
              status: pt.progressPct >= 100 ? "completed" : pt.progressPct > 0 ? "in_progress" : "not_started",
            })
            .returning();

          refToId.set(pt.sourceRef, inserted.id);
        }

        writeAuditLog(ctx.db, { projectId: input.projectId, userId: ctx.userId, action: "import", entityType: "task", entityId: input.projectId, metadata: { count: parsedTasks.length, format } });
        return { imported: parsedTasks.length, format };
      });
    }),
});
