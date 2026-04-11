import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../index";
import { gpsZones } from "@/server/db/schema";
import { assertProjectAccess, assertTaskInProject } from "../helpers";
import { writeAuditLog } from "@/server/services/audit";

const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export const zoneRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId, ctx.userId);
      return ctx.db.query.gpsZones.findMany({
        where: eq(gpsZones.projectId, input.projectId),
        with: {
          defaultTask: { columns: { id: true, name: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1, "Zone name is required"),
        polygon: polygonSchema,
        defaultTaskId: z.string().uuid().nullable().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId, ctx.userId);
      if (input.defaultTaskId) {
        await assertTaskInProject(ctx.db, input.defaultTaskId, input.projectId);
      }
      const [zone] = await ctx.db
        .insert(gpsZones)
        .values({
          projectId: input.projectId,
          name: input.name,
          polygon: input.polygon,
          defaultTaskId: input.defaultTaskId ?? null,
          color: input.color ?? "#3B82F6",
        })
        .returning();
      writeAuditLog(ctx.db, { projectId: input.projectId, userId: ctx.userId, action: "create", entityType: "gps_zone", entityId: zone.id, metadata: { name: zone.name } });
      return zone;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        polygon: polygonSchema.optional(),
        defaultTaskId: z.string().uuid().nullable().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const zone = await ctx.db.query.gpsZones.findFirst({
        where: eq(gpsZones.id, input.id),
        columns: { projectId: true },
      });
      if (!zone) throw new TRPCError({ code: "NOT_FOUND", message: "Zone not found" });
      await assertProjectAccess(ctx.db, zone.projectId, ctx.orgId, ctx.userId);
      if (input.defaultTaskId) {
        await assertTaskInProject(ctx.db, input.defaultTaskId, zone.projectId);
      }

      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(gpsZones)
        .set(data)
        .where(and(eq(gpsZones.id, id), eq(gpsZones.projectId, zone.projectId)))
        .returning();
      writeAuditLog(ctx.db, { projectId: zone.projectId, userId: ctx.userId, action: "update", entityType: "gps_zone", entityId: id });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const zone = await ctx.db.query.gpsZones.findFirst({
        where: eq(gpsZones.id, input.id),
        columns: { projectId: true },
      });
      if (!zone) throw new TRPCError({ code: "NOT_FOUND", message: "Zone not found" });
      await assertProjectAccess(ctx.db, zone.projectId, ctx.orgId, ctx.userId);

      await ctx.db.delete(gpsZones).where(eq(gpsZones.id, input.id));
      writeAuditLog(ctx.db, { projectId: zone.projectId, userId: ctx.userId, action: "delete", entityType: "gps_zone", entityId: input.id });
      return { success: true };
    }),
});
