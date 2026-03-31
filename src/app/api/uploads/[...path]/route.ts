import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

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
  pdf: "application/pdf",
};

/**
 * Serve uploaded files from /tmp/uploads on Vercel.
 * Only used when R2 is not configured (demo/dev fallback).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const storageKey = segments.join("/");

  // Prevent path traversal
  if (storageKey.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const filePath = join("/tmp/uploads", storageKey);

  try {
    const data = await readFile(filePath);
    const ext = storageKey.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
