import { z } from "zod";
import { eq, asc, and, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../index";
import { tasks } from "@/server/db/schema";
import { detectAndParse } from "@/server/services/programme-import";

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
  list: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const allTasks = await ctx.db.query.tasks.findMany({
        where: eq(tasks.projectId, input.projectId),
        orderBy: [asc(tasks.sortOrder)],
      });
      return buildTree(allTasks);
    }),

  create: publicProcedure
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
      const parentId = input.parentTaskId ?? null;

      // Get next sortOrder for tasks with the same parent
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
          plannedStart: input.plannedStart,
          plannedEnd: input.plannedEnd,
          status: input.status ?? "not_started",
          progressPct: input.progressPct ?? 0,
          sortOrder: nextSort,
        })
        .returning();
      return task;
    }),

  update: publicProcedure
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
      const { id, ...data } = input;
      const [task] = await ctx.db
        .update(tasks)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();
      return task;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        // Find the task to get its parentTaskId
        const task = await tx.query.tasks.findFirst({
          where: eq(tasks.id, input.id),
        });
        if (!task) throw new Error("Task not found");

        // Reassign children to the deleted task's parent
        await tx
          .update(tasks)
          .set({ parentTaskId: task.parentTaskId, updatedAt: new Date() })
          .where(eq(tasks.parentTaskId, input.id));

        // Delete the task
        await tx.delete(tasks).where(eq(tasks.id, input.id));

        return { success: true };
      });
    }),

  reorder: publicProcedure
    .input(
      z.object({
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

  previewImport: publicProcedure
    .input(z.object({ xml: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const result = detectAndParse(input.xml);
      return result;
    }),

  import: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        xml: z.string().min(10),
        clearExisting: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tasks: parsedTasks, format } = detectAndParse(input.xml);

      return ctx.db.transaction(async (tx) => {
        if (input.clearExisting) {
          await tx.delete(tasks).where(eq(tasks.projectId, input.projectId));
        }

        // Map sourceRef -> new task ID for parent resolution
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
              parentTaskId: parentTaskId,
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

        return { imported: parsedTasks.length, format };
      });
    }),
});
