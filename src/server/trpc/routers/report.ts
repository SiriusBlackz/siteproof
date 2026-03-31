import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../index";
import { reports } from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";
import { getPublicUrl } from "@/server/services/storage";
import { assertProjectAccess } from "../helpers";
import { writeAuditLog } from "@/server/services/audit";
import crypto from "crypto";

export const reportRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId);
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
      if (!report) throw new Error("Report not found");
      await assertProjectAccess(ctx.db, report.projectId, ctx.orgId);
      return report;
    }),

  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.db, input.projectId, ctx.orgId);

      const existing = await ctx.db.query.reports.findMany({
        where: eq(reports.projectId, input.projectId),
        columns: { reportNumber: true },
        orderBy: [desc(reports.reportNumber)],
        limit: 1,
      });
      const reportNumber = (existing[0]?.reportNumber ?? 0) + 1;

      const passwordHash = input.password
        ? crypto.createHash("sha256").update(input.password).digest("hex")
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
          },
        });
      } catch {
        const {
          gatherReportData,
          renderReportHTML,
          htmlToPdf,
        } = await import("@/server/services/report-generator");

        try {
          const reportData = await gatherReportData(ctx.db, {
            projectId: input.projectId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            password: input.password,
            generatedBy: ctx.userId,
          });

          const html = await renderReportHTML(reportData);
          const pdfBuffer = await htmlToPdf(html, input.password);

          const storageKey = `projects/${input.projectId}/reports/report-${reportNumber}.pdf`;

          const isR2 = process.env.R2_ACCESS_KEY_ID && process.env.R2_ACCESS_KEY_ID !== "PLACEHOLDER";

          if (!isR2) {
            // No R2 — store PDF base64 in DB for retrieval via /api/reports/[id]/pdf
            await ctx.db
              .update(reports)
              .set({
                status: "completed",
                pdfStorageKey: storageKey,
                reportData: {
                  stats: reportData.summaryStats,
                  meta: reportData.meta,
                  pdfBase64: pdfBuffer.toString("base64"),
                },
              })
              .where(eq(reports.id, report.id));
          } else {
            // R2 configured — write to storage
            const { writeFile, mkdir } = await import("fs/promises");
            const { join, dirname } = await import("path");
            const filePath = join(process.cwd(), "public", "uploads", storageKey);
            await mkdir(dirname(filePath), { recursive: true });
            await writeFile(filePath, pdfBuffer);

            await ctx.db
              .update(reports)
              .set({
                status: "completed",
                pdfStorageKey: storageKey,
                reportData: {
                  stats: reportData.summaryStats,
                  meta: reportData.meta,
                },
              })
              .where(eq(reports.id, report.id));
          }
        } catch (syncErr) {
          console.error("[report.generate] Sync fallback failed:", syncErr);
          await ctx.db
            .update(reports)
            .set({ status: "failed" })
            .where(eq(reports.id, report.id));
        }
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
      if (!report) throw new Error("Report not found");
      await assertProjectAccess(ctx.db, report.projectId, ctx.orgId);

      if (report.status !== "completed" || !report.pdfStorageKey) {
        throw new Error("Report is not ready for download");
      }

      if (report.passwordHash) {
        if (!input.password) throw new Error("Password required");
        const hash = crypto
          .createHash("sha256")
          .update(input.password)
          .digest("hex");
        if (hash !== report.passwordHash) throw new Error("Incorrect password");
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
