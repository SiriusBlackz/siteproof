import { NextRequest, NextResponse } from "next/server";
import { fetchFromStorage } from "@/server/services/storage";
import { db } from "@/server/db";
import { resolveCurrentUser, DemoEnsureUserError } from "@/server/services/current-user";
import { assertProjectAccess } from "@/server/trpc/helpers";
import { TRPCError } from "@trpc/server";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

/**
 * Serve uploaded evidence files from /tmp/uploads when R2 is not configured.
 * Requires auth + project membership. Report PDFs must go through
 * /api/reports/[id]/pdf — this route refuses any path under projects/*\/reports/.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  // Reject path traversal, absolute paths, and empty segments.
  if (segments.some((s) => !s || s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return json(400, { error: "Invalid path" });
  }

  const storageKey = segments.join("/");

  // Only allow the canonical evidence layout: projects/<uuid>/evidence/<uuid>/<file>
  if (segments.length < 4 || segments[0] !== "projects" || !UUID_RE.test(segments[1])) {
    return json(400, { error: "Invalid path" });
  }
  if (segments[2] === "reports") {
    // Force report downloads through the dedicated, auth+password-aware route.
    return json(403, { error: "Use /api/reports/[id]/pdf" });
  }
  if (segments[2] !== "evidence") {
    return json(400, { error: "Invalid path" });
  }

  let resolved;
  try {
    resolved = await resolveCurrentUser(req.headers);
  } catch (e) {
    if (e instanceof DemoEnsureUserError) {
      console.error("[uploads] demo user resolution failed:", e.cause);
      return json(401, { error: "Session unavailable" });
    }
    throw e;
  }
  if (!resolved.userId || !resolved.orgId) {
    return json(401, { error: "Not signed in" });
  }

  const projectId = segments[1];
  try {
    await assertProjectAccess(db, projectId, resolved.orgId, resolved.userId);
  } catch (e) {
    if (e instanceof TRPCError) {
      const status = e.code === "NOT_FOUND" ? 404 : 403;
      return json(status, { error: "Access denied" });
    }
    throw e;
  }

  const data = await fetchFromStorage(storageKey);
  if (!data) {
    return json(404, { error: "File not found" });
  }
  const ext = storageKey.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
