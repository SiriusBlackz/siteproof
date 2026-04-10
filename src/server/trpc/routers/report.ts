import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../index";
import { reports } from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";
import { getPublicUrl } from "@/server/services/storage";
import { assertProjectAccess } from "../helpers";
import { writeAuditLog } from "@/server/services/audit";
import bcrypt from "bcryptjs";

export const reportRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId, ctx.userId);
      return ctx.db.query.reports.findMany({
        where: eq(reports.projectId, input.projectId),
        orderBy: [desc(reports.reportNumber)],
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.query.reports.findFirst({
        where: eq(reports.id, input.id),
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      await assertProjectAccess(ctx.db, report.projectId, ctx.orgId, ctx.userId);
      return report;
    }),

  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        password: z.string().optional(),
        signatures: z.array(z.object({
          role: z.enum(["contractor", "project_manager", "client"]),
          name: z.string().min(1),
          title: z.string().optional(),
          date: z.string().optional(),
          imageDataUrl: z.string().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId, ctx.userId);

      // Prevent duplicate generation — reject if a report is already generating
      const inProgress = await ctx.db.query.reports.findFirst({
        where: and(
          eq(reports.projectId, input.projectId),
          eq(reports.status, "generating")
        ),
      });
      if (inProgress) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A report is already being generated. Please wait for it to complete.",
        });
      }

      const existing = await ctx.db.query.reports.findMany({
        where: eq(reports.projectId, input.projectId),
        columns: { reportNumber: true },
        orderBy: [desc(reports.reportNumber)],
        limit: 1,
      });
      const reportNumber = (existing[0]?.reportNumber ?? 0) + 1;

      const passwordHash = input.password
        ? await bcrypt.hash(input.password, 10)
        : null;

      const [report] = await ctx.db
        .insert(reports)
        .values({
          projectId: input.projectId,
          generatedBy: ctx.userId,
          reportNumber,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          passwordHash,
          status: "generating",
        })
        .returning();

      try {
        await inngest.send({
          name: "report/generate",
          data: {
            reportId: report.id,
            projectId: input.projectId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            password: input.password,
            generatedBy: ctx.userId,
            signatures: input.signatures,
          },
        });
      } catch (err) {
        console.error("[report.generate] Failed to queue report generation:", err);
        await ctx.db
          .update(reports)
          .set({ status: "failed" })
          .where(eq(reports.id, report.id));
      }

      writeAuditLog(ctx.db, { projectId: input.projectId, userId: ctx.userId, action: "generate", entityType: "report", entityId: report.id, metadata: { reportNumber, periodStart: input.periodStart, periodEnd: input.periodEnd } });
      return report;
    }),

  download: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        password: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.query.reports.findFirst({
        where: eq(reports.id, input.id),
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      await assertProjectAccess(ctx.db, report.projectId, ctx.orgId, ctx.userId);

      if (report.status !== "completed" || !report.pdfStorageKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Report is not ready for download" });
      }

      if (report.passwordHash) {
        if (!input.password) throw new TRPCError({ code: "UNAUTHORIZED", message: "Password required" });
        const match = await bcrypt.compare(input.password, report.passwordHash);
        if (!match) throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password" });
      }

      // If PDF is stored in DB (no R2), serve via dedicated API route
      const reportDataObj = report.reportData as Record<string, unknown> | null;
      if (reportDataObj?.pdfBase64) {
        return {
          url: `/api/reports/${report.id}/pdf`,
          filename: `report-${report.reportNumber}.pdf`,
        };
      }

      return {
        url: getPublicUrl(report.pdfStorageKey),
        filename: `report-${report.reportNumber}.pdf`,
      };
    }),
});
