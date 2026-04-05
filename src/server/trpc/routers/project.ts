import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../index";
import { projects, organisations } from "@/server/db/schema";
import { assertProjectAccess } from "../helpers";
import { writeAuditLog } from "@/server/services/audit";
import {
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
} from "@/server/services/stripe";

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.query.projects.findMany({
      where: eq(projects.orgId, ctx.orgId),
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });

    // In demo mode, treat pending_payment as active
    if (process.env.DEMO_MODE === "true") {
      return result.map((p) => ({
        ...p,
        status: p.status === "pending_payment" ? "active" : p.status,
      }));
    }

    return result;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      if (project.orgId !== ctx.orgId) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });

      // In demo mode, treat pending_payment as active
      if (process.env.DEMO_MODE === "true" && project.status === "pending_payment") {
        return { ...project, status: "active" };
      }
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
      const stripeConfigured =
        process.env.DEMO_MODE !== "true" &&
        process.env.STRIPE_SECRET_KEY &&
        !process.env.STRIPE_SECRET_KEY.includes("PLACEHOLDER");

      // Create project — active immediately if Stripe not configured, pending otherwise
      const [project] = await ctx.db
        .insert(projects)
        .values({
          name: input.name,
          orgId: ctx.orgId,
          status: stripeConfigured ? "pending_payment" : "active",
          reference: input.reference || null,
          clientName: input.clientName || null,
          contractType: input.contractType || null,
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          reportingFrequency: input.reportingFrequency || null,
        })
        .returning();

      writeAuditLog(ctx.db, { projectId: project.id, userId: ctx.userId, action: "create", entityType: "project", entityId: project.id, metadata: { name: project.name } });

      // Skip Stripe in dev when not configured
      if (!stripeConfigured) {
        return { project, checkoutUrl: null };
      }

      // Get or create Stripe customer for the org
      const org = await ctx.db.query.organisations.findFirst({
        where: eq(organisations.id, ctx.orgId),
      });
      const customerId = await getOrCreateCustomer(
        ctx.db,
        ctx.orgId,
        org?.name ?? "Organisation",
        ctx.dbUser.email
      );

      // Create Stripe Checkout Session
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const checkoutUrl = await createCheckoutSession({
        customerId,
        projectId: project.id,
        projectName: input.name,
        successUrl: `${appUrl}/projects/${project.id}?checkout=success`,
        cancelUrl: `${appUrl}/projects/new?checkout=cancelled`,
      });

      return { project, checkoutUrl };
    }),

  update: adminProcedure
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
      writeAuditLog(ctx.db, { projectId: id, userId: ctx.userId, action: "update", entityType: "project", entityId: id });
      return project;
    }),

  archive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.id, ctx.orgId);

      // Cancel Stripe subscription if one exists
      const existing = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
      if (existing?.stripeSubscriptionId) {
        try {
          await cancelSubscription(existing.stripeSubscriptionId);
        } catch (err) {
          console.error("[project.archive] Failed to cancel subscription:", err);
        }
      }

      const [project] = await ctx.db
        .update(projects)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(projects.id, input.id))
        .returning();
      writeAuditLog(ctx.db, { projectId: input.id, userId: ctx.userId, action: "archive", entityType: "project", entityId: input.id });
      return project;
    }),

  createPortalSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      const org = await ctx.db.query.organisations.findFirst({
        where: eq(organisations.id, ctx.orgId),
      });

      if (!org?.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No billing account found. Create a project first to set up billing.",
        });
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const portalUrl = await createPortalSession(
        org.stripeCustomerId,
        `${appUrl}/projects`
      );

      return { portalUrl };
    }),
});
