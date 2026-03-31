import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { reports } from "@/server/db/schema";

/**
 * Serve PDF from database storage (used when R2 is not configured).
 * The PDF is stored as base64 in the report_data JSONB column.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const report = await db.query.reports.findFirst({
    where: eq(reports.id, id),
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const reportData = report.reportData as Record<string, unknown> | null;
  const pdfBase64 = reportData?.pdfBase64 as string | undefined;

  if (!pdfBase64) {
    return NextResponse.json({ error: "PDF not available" }, { status: 404 });
  }

  const pdfBuffer = Buffer.from(pdfBase64, "base64");

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${report.reportNumber}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
