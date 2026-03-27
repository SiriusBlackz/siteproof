import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../index";
import { projects } from "@/server/db/schema";

export const projectRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.projects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });
  }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
      if (!project) {
        throw new Error("Project not found");
      }
      return project;
    }),

  create: publicProcedure
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
          ...input,
          orgId: "00000000-0000-0000-0000-000000000000", // TODO: Get from auth context
        })
        .returning();
      return project;
    }),

  update: publicProcedure
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
      const { id, ...data } = input;
      const [project] = await ctx.db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return project;
    }),

  archive: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .update(projects)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(projects.id, input.id))
        .returning();
      return project;
    }),
});
