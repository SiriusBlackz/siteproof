import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../index";
import { projects } from "@/server/db/schema";
import { assertProjectAccess } from "../helpers";

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.projects.findMany({
      where: eq(projects.orgId, ctx.orgId),
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
      if (!project) throw new Error("Project not found");
      if (project.orgId !== ctx.orgId) throw new Error("Access denied");
      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Project name is required"),
        reference: z.string().optional(),
        clientName: z.string().optional(),
        contractType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        reportingFrequency: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .insert(projects)
        .values({
          name: input.name,
          orgId: ctx.orgId,
          reference: input.reference || null,
          clientName: input.clientName || null,
          contractType: input.contractType || null,
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          reportingFrequency: input.reportingFrequency || null,
        })
        .returning();
      return project;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        reference: z.string().optional(),
        clientName: z.string().optional(),
        contractType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        reportingFrequency: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.id, ctx.orgId);
      const { id, ...data } = input;
      const cleaned: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(data)) {
        cleaned[key] = val === "" ? null : val;
      }
      const [project] = await ctx.db
        .update(projects)
        .set({ ...cleaned, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return project;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.id, ctx.orgId);
      const [project] = await ctx.db
        .update(projects)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(projects.id, input.id))
        .returning();
      return project;
    }),
});
