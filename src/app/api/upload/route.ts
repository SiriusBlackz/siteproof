import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { uploadIntents } from "@/server/db/schema";
import { resolveCurrentUser, DemoEnsureUserError } from "@/server/services/current-user";
import { assertProjectAccess } from "@/server/trpc/helpers";
import { TRPCError } from "@trpc/server";
import { checkRateLimit } from "@/server/services/rate-limit";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
const VALID_KEY_PATTERN = /^projects\/[0-9a-f-]+\/evidence\/[0-9a-f-]+\/[^/]+$/;
const UPLOAD_RATE_LIMIT = { max: 20, windowMs: 60_000 }; // 20 uploads/min per IP

function getUploadDir(): string {
  if (process.env.VERCEL) return "/tmp/uploads";
  return join(process.cwd(), "public", "uploads");
}

function json(status: number, body: unknown, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: extraHeaders });
}

/**
 * Local/demo fallback for file uploads — writes to /tmp/uploads on Vercel or
 * public/uploads locally. Only used when R2 is not configured.
 * Every upload must be backed by a fresh upload_intents row created by
 * evidence.getUploadUrl for the same user+project.
 */
export async function POST(req: NextRequest) {
  // Rate limit by IP (defense against abuse)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`upload:${ip}`, UPLOAD_RATE_LIMIT);
  if (!rl.allowed) {
    return json(
      429,
      { error: "Too many uploads. Try again later." },
      { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
    );
  }

  let resolved;
  try {
    resolved = await resolveCurrentUser(req.headers);
  } catch (e) {
    if (e instanceof DemoEnsureUserError) {
      console.error("[upload] demo user resolution failed:", e.cause);
      return json(401, { error: "Session unavailable" });
    }
    throw e;
  }
  if (!resolved.userId || !resolved.orgId) {
    return json(401, { error: "Not signed in" });
  }

  const storageKey = req.nextUrl.searchParams.get("key");
  if (!storageKey) {
    return json(400, { error: "Missing key parameter" });
  }
  if (!VALID_KEY_PATTERN.test(storageKey) || storageKey.includes("..")) {
    return json(400, { error: "Invalid key format" });
  }

  // Resolve the upload intent for this key + caller.
  const intent = await db.query.uploadIntents.findFirst({
    where: eq(uploadIntents.storageKey, storageKey),
  });
  if (!intent) {
    return json(404, { error: "No matching upload intent" });
  }
  if (intent.userId !== resolved.userId) {
    return json(403, { error: "Upload intent does not belong to caller" });
  }
  if (intent.consumedAt) {
    return json(409, { error: "Upload already consumed" });
  }
  if (intent.expiresAt < new Date()) {
    return json(400, { error: "Upload intent expired" });
  }

  // The caller may be in a different org by now — re-check project access.
  try {
    await assertProjectAccess(db, intent.projectId, resolved.orgId, resolved.userId);
  } catch (e) {
    if (e instanceof TRPCError) return json(403, { error: "Access denied" });
    throw e;
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return json(413, { error: "File too large" });
  }

  const body = await req.arrayBuffer();
  if (!body.byteLength) {
    return json(400, { error: "Empty body" });
  }
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return json(413, { error: "File too large" });
  }
  if (body.byteLength > intent.maxSizeBytes) {
    return json(413, { error: "File exceeds declared size" });
  }

  const filePath = join(getUploadDir(), storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(body));

  return json(200, { success: true, storageKey });
}
