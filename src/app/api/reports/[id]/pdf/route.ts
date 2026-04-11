import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { reports } from "@/server/db/schema";
import { resolveCurrentUser, DemoEnsureUserError } from "@/server/services/current-user";
import { assertProjectAccess } from "@/server/trpc/helpers";
import { fetchFromStorage } from "@/server/services/storage";
import { TRPCError } from "@trpc/server";

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let resolved;
  try {
    resolved = await resolveCurrentUser(req.headers);
  } catch (e) {
    if (e instanceof DemoEnsureUserError) {
      console.error("[reports pdf] demo user resolution failed:", e.cause);
      return json(401, { error: "Session unavailable" });
    }
    throw e;
  }
  if (!resolved.userId || !resolved.orgId) {
    return json(401, { error: "Not signed in" });
  }

  const report = await db.query.reports.findFirst({
    where: eq(reports.id, id),
  });
  if (!report) {
    return json(404, { error: "Report not found" });
  }

  try {
    await assertProjectAccess(db, report.projectId, resolved.orgId, resolved.userId);
  } catch (e) {
    if (e instanceof TRPCError) {
      const status = e.code === "NOT_FOUND" ? 404 : 403;
      return json(status, { error: "Access denied" });
    }
    throw e;
  }

  if (report.status !== "completed") {
    return json(409, { error: "Report is not ready" });
  }

  if (report.passwordHash) {
    const password =
      req.nextUrl.searchParams.get("p") ??
      req.headers.get("x-report-password");
    if (!password) {
      return json(401, { error: "Password required" });
    }
    const match = await bcrypt.compare(password, report.passwordHash);
    if (!match) {
      return json(401, { error: "Incorrect password" });
    }
  }

  // Resolve the bytes — prefer inline base64, fall back to storage (R2 or disk).
  // Never hand out a public R2 URL for a report; always stream through this
  // auth+password-aware route.
  const reportData = report.reportData as Record<string, unknown> | null;
  const pdfBase64 = reportData?.pdfBase64 as string | undefined;
  let pdfBuffer: Buffer | null = null;
  if (pdfBase64) {
    pdfBuffer = Buffer.from(pdfBase64, "base64");
  } else if (report.pdfStorageKey) {
    pdfBuffer = await fetchFromStorage(report.pdfStorageKey);
  }
  if (!pdfBuffer) {
    return json(404, { error: "PDF not available" });
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${report.reportNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
