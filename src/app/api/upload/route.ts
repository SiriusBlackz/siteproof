import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

/**
 * Local development fallback for file uploads.
 * Writes files to public/uploads/{storageKey} so Next.js serves them statically.
 */
export async function POST(req: NextRequest) {
  const storageKey = req.nextUrl.searchParams.get("key");
  if (!storageKey) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  const body = await req.arrayBuffer();
  if (!body.byteLength) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "public", "uploads", storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(body));

  return NextResponse.json({ success: true, storageKey });
}
