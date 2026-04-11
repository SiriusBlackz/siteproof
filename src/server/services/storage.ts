import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { join, dirname } from "path";

export const isR2Configured = Boolean(
  process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_ACCESS_KEY_ID !== "PLACEHOLDER" &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCOUNT_ID !== "PLACEHOLDER"
);

function getLocalUploadDir(): string {
  if (process.env.VERCEL) return "/tmp/uploads";
  return join(process.cwd(), ".local-uploads");
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

export interface UploadUrlResult {
  uploadUrl: string;
  storageKey: string;
  isLocal: boolean;
}

export async function getUploadUrl(
  storageKey: string,
  contentType: string
): Promise<UploadUrlResult> {
  if (isR2Configured) {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: storageKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    return { uploadUrl, storageKey, isLocal: false };
  }

  // Local/demo fallback — upload goes through /api/upload (uses /tmp on Vercel)
  return {
    uploadUrl: `/api/upload?key=${encodeURIComponent(storageKey)}`,
    storageKey,
    isLocal: true,
  };
}

export function getPublicUrl(storageKey: string): string {
  // Sanitize storage key to prevent path traversal
  const safeKey = storageKey.replace(/\.\./g, "").replace(/\/\//g, "/");

  if (isR2Configured) {
    return `${process.env.R2_PUBLIC_URL}/${safeKey}`;
  }
  // Always go through the auth'd /api/uploads/ route when R2 isn't configured.
  // On Vercel the underlying file lives in /tmp; locally it lives in
  // .local-uploads/ (gitignored). Both are served via the same hardened
  // handler so dev testing exercises the same code path as production demo.
  return `/api/uploads/${safeKey.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Server-side upload. Used for artifacts the server produces (report PDFs,
 * thumbnails) rather than direct browser → R2 uploads.
 * - R2 configured: PutObject to the configured bucket
 * - Local fallback: write to /tmp/uploads or .local-uploads/
 */
export async function uploadToStorage(
  storageKey: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (isR2Configured) {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      })
    );
    return;
  }

  const { writeFile, mkdir } = await import("fs/promises");
  const filePath = join(getLocalUploadDir(), storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
}

/**
 * Server-side fetch. Used by the PDF route to stream report bytes through
 * the auth+password-aware handler without ever exposing a public R2 URL.
 * Returns null if the object does not exist.
 */
export async function fetchFromStorage(
  storageKey: string
): Promise<Buffer | null> {
  if (isR2Configured) {
    const client = getS3Client();
    try {
      const res = await client.send(
        new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: storageKey,
        })
      );
      if (!res.Body) return null;
      // AWS SDK v3 returns a readable stream — collect into a buffer
      const chunks: Buffer[] = [];
      for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (err) {
      const code = (err as { name?: string })?.name;
      if (code === "NoSuchKey" || code === "NotFound") return null;
      throw err;
    }
  }

  const { readFile } = await import("fs/promises");
  try {
    return await readFile(join(getLocalUploadDir(), storageKey));
  } catch {
    return null;
  }
}
