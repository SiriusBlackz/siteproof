import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../index";
import { gpsZones } from "@/server/db/schema";

const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export const zoneRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.gpsZones.findMany({
        where: eq(gpsZones.projectId, input.projectId),
        with: {
          defaultTask: { columns: { id: true, name: true } },
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1, "Zone name is required"),
        polygon: polygonSchema,
        defaultTaskId: z.string().uuid().nullable().optional(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
      return zone;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        polygon: polygonSchema.optional(),
        defaultTaskId: z.string().uuid().nullable().optional(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [zone] = await ctx.db
        .update(gpsZones)
        .set(data)
        .where(eq(gpsZones.id, id))
        .returning();
      return zone;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(gpsZones).where(eq(gpsZones.id, input.id));
      return { success: true };
    }),
});
