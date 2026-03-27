import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../index";
import { reports } from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";
import { getPublicUrl } from "@/server/services/storage";
import crypto from "crypto";

export const reportRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.reports.findMany({
        where: eq(reports.projectId, input.projectId),
        orderBy: [desc(reports.reportNumber)],
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.query.reports.findFirst({
        where: eq(reports.id, input.id),
      });
      if (!report) throw new Error("Report not found");
      return report;
    }),

  generate: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get next report number
      const existing = await ctx.db.query.reports.findMany({
        where: eq(reports.projectId, input.projectId),
        columns: { reportNumber: true },
        orderBy: [desc(reports.reportNumber)],
        limit: 1,
      });
      const reportNumber = (existing[0]?.reportNumber ?? 0) + 1;

      // Hash password if provided
      const passwordHash = input.password
        ? crypto.createHash("sha256").update(input.password).digest("hex")
        : null;

      // Create report record with "generating" status
      const [report] = await ctx.db
        .insert(reports)
        .values({
          projectId: input.projectId,
          generatedBy: "00000000-0000-0000-0000-000000000001", // TODO: auth
          reportNumber,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          passwordHash,
          status: "generating",
        })
        .returning();

      // Send Inngest event to trigger background generation
      try {
        await inngest.send({
          name: "report/generate",
          data: {
            reportId: report.id,
            projectId: input.projectId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            password: input.password,
            generatedBy: "00000000-0000-0000-0000-000000000001",
          },
        });
      } catch {
        // If Inngest isn't configured, generate synchronously (dev fallback)
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
            generatedBy: "00000000-0000-0000-0000-000000000001",
          });

          const html = await renderReportHTML(reportData);
          const pdfBuffer = await htmlToPdf(html, input.password);

          // Write to local storage
          const { writeFile, mkdir } = await import("fs/promises");
          const { join, dirname } = await import("path");
          const storageKey = `projects/${input.projectId}/reports/report-${reportNumber}.pdf`;
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
        } catch (err) {
          await ctx.db
            .update(reports)
            .set({ status: "failed" })
            .where(eq(reports.id, report.id));
        }
      }

      return report;
    }),

  download: publicProcedure
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
      if (report.status !== "completed" || !report.pdfStorageKey) {
        throw new Error("Report is not ready for download");
      }

      // Verify password if the report is password-protected
      if (report.passwordHash) {
        if (!input.password) {
          throw new Error("Password required");
        }
        const hash = crypto
          .createHash("sha256")
          .update(input.password)
          .digest("hex");
        if (hash !== report.passwordHash) {
          throw new Error("Incorrect password");
        }
      }

      return {
        url: getPublicUrl(report.pdfStorageKey),
        filename: `report-${report.reportNumber}.pdf`,
      };
    }),
});
