import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { readFile } from "fs/promises";
import { join } from "path";
import { db } from "@/server/db";
import { reports } from "@/server/db/schema";
import { resolveCurrentUser, DemoEnsureUserError } from "@/server/services/current-user";
import { assertProjectAccess } from "@/server/trpc/helpers";
import { TRPCError } from "@trpc/server";

function getUploadDir(): string {
  if (process.env.VERCEL) return "/tmp/uploads";
  return join(process.cwd(), ".local-uploads");
}

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

  // Resolve the bytes — prefer inline base64 in reportData, fall back to disk.
  const reportData = report.reportData as Record<string, unknown> | null;
  const pdfBase64 = reportData?.pdfBase64 as string | undefined;
  let pdfBuffer: Buffer | null = null;
  if (pdfBase64) {
    pdfBuffer = Buffer.from(pdfBase64, "base64");
  } else if (report.pdfStorageKey) {
    try {
      pdfBuffer = await readFile(join(getUploadDir(), report.pdfStorageKey));
    } catch {
      return json(404, { error: "PDF not available" });
    }
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
