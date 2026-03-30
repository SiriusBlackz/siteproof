import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { isDemoMode } from "@/lib/demo";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB
const VALID_KEY_PATTERN = /^projects\/[0-9a-f-]+\/evidence\/[0-9a-f-]+\/.+$/;

/**
 * Local development fallback for file uploads.
 * Writes files to public/uploads/{storageKey} so Next.js serves them statically.
 */
export async function POST(req: NextRequest) {
  // Require authentication (skip in demo mode)
  if (!isDemoMode()) {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const storageKey = req.nextUrl.searchParams.get("key");
  if (!storageKey) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  // Validate storage key format to prevent path traversal
  if (!VALID_KEY_PATTERN.test(storageKey) || storageKey.includes("..")) {
    return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const body = await req.arrayBuffer();
  if (!body.byteLength) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const filePath = join(process.cwd(), "public", "uploads", storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(body));

  return NextResponse.json({ success: true, storageKey });
}
