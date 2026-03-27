import { z } from "zod";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../index";
import { auditLog, users } from "@/server/db/schema";

export const auditRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(200).default(50),
        action: z.string().optional(),
        userId: z.string().uuid().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(auditLog.projectId, input.projectId)];

      if (input.action) {
        conditions.push(eq(auditLog.action, input.action));
      }
      if (input.userId) {
        conditions.push(eq(auditLog.userId, input.userId));
      }
      if (input.dateFrom) {
        conditions.push(gte(auditLog.createdAt, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        conditions.push(lte(auditLog.createdAt, new Date(input.dateTo)));
      }

      if (input.cursor) {
        const cursorRow = await ctx.db.query.auditLog.findFirst({
          where: eq(auditLog.id, input.cursor),
          columns: { createdAt: true },
        });
        if (cursorRow?.createdAt) {
          conditions.push(lte(auditLog.createdAt, cursorRow.createdAt));
          conditions.push(
            // Exclude the cursor itself
            eq(auditLog.id, input.cursor) as unknown as ReturnType<typeof eq> extends infer T ? never : never
          );
        }
      }

      const items = await ctx.db.query.auditLog.findMany({
        where: and(...conditions),
        orderBy: [desc(auditLog.createdAt)],
        limit: input.limit + 1,
        with: {
          user: { columns: { id: true, name: true, avatarUrl: true } },
        },
      });

      const hasMore = items.length > input.limit;
      const page = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: page.map((item) => ({
          id: item.id,
          action: item.action,
          entityType: item.entityType,
          entityId: item.entityId,
          metadata: item.metadata as Record<string, unknown> | null,
          createdAt: item.createdAt,
          user: item.user
            ? {
                id: item.user.id,
                name: item.user.name,
                avatarUrl: item.user.avatarUrl,
              }
            : null,
        })),
        nextCursor: hasMore ? page[page.length - 1].id : null,
      };
    }),

  // CSV export — returns all entries as a flat array of objects
  export: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        action: z.string().optional(),
        userId: z.string().uuid().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(auditLog.projectId, input.projectId)];
      if (input.action) conditions.push(eq(auditLog.action, input.action));
      if (input.userId) conditions.push(eq(auditLog.userId, input.userId));
      if (input.dateFrom)
        conditions.push(gte(auditLog.createdAt, new Date(input.dateFrom)));
      if (input.dateTo)
        conditions.push(lte(auditLog.createdAt, new Date(input.dateTo)));

      const items = await ctx.db.query.auditLog.findMany({
        where: and(...conditions),
        orderBy: [desc(auditLog.createdAt)],
        with: {
          user: { columns: { name: true } },
        },
      });

      return items.map((item) => ({
        timestamp: item.createdAt?.toISOString() ?? "",
        user: item.user?.name ?? "System",
        action: item.action,
        entity_type: item.entityType,
        entity_id: item.entityId,
        metadata: item.metadata ? JSON.stringify(item.metadata) : "",
      }));
    }),
});
