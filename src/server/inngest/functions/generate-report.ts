import { inngest } from "../client";
import { db } from "@/server/db";
import { reports } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  gatherReportData,
  renderReportHTML,
  htmlToPdf,
} from "@/server/services/report-generator";

export const generateReport = inngest.createFunction(
  {
    id: "generate-report",
    retries: 3,
    triggers: [{ event: "report/generate" }],
    onFailure: async ({ event }) => {
      // Mark report as failed after all retries exhausted
      const reportId = event.data.event.data?.reportId as string | undefined;
      if (reportId) {
        console.error(`[generate-report] All retries exhausted for report ${reportId}`);
        await db
          .update(reports)
          .set({ status: "failed" })
          .where(eq(reports.id, reportId));
      }
    },
  },
  async ({ event, step }) => {
    const { reportId, projectId, periodStart, periodEnd, generatedBy, signatures } =
      event.data as {
        reportId: string;
        projectId: string;
        periodStart: string;
        periodEnd: string;
        generatedBy: string;
        signatures?: { role: "contractor" | "project_manager" | "client"; name: string; title?: string; date?: string; imageDataUrl?: string }[];
      };

    // Step 1: Gather report data
    const reportData = await step.run("gather-data", async () => {
      return gatherReportData(db, {
        projectId,
        periodStart,
        periodEnd,
        generatedBy,
        signatures,
      });
    });

    // Step 2: Render HTML and convert to PDF
    const pdfResult = await step.run("render-pdf", async () => {
      const html = await renderReportHTML(reportData);
      const pdfBuffer = await htmlToPdf(html);
      return {
        size: pdfBuffer.length,
        base64: pdfBuffer.toString("base64"),
      };
    });

    // Step 3: Upload PDF to storage (local dev writes to public/uploads/)
    const storageKey = await step.run("upload-pdf", async () => {
      const key = `projects/${projectId}/reports/report-${reportData.reportNumber}.pdf`;

      const { writeFile, mkdir } = await import("fs/promises");
      const { join, dirname } = await import("path");
      const uploadDir = process.env.VERCEL ? "/tmp/uploads" : join(process.cwd(), "public", "uploads");
      const filePath = join(uploadDir, key);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, Buffer.from(pdfResult.base64, "base64"));

      return key;
    });

    // Step 4: Update report record
    await step.run("update-record", async () => {
      await db
        .update(reports)
        .set({
          status: "completed",
          pdfStorageKey: storageKey,
          reportData: {
            stats: reportData.summaryStats,
            meta: reportData.meta,
          },
        })
        .where(eq(reports.id, reportId));
    });

    return { reportId, storageKey, reportNumber: reportData.reportNumber };
  }
);
