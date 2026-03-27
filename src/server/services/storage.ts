import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const isR2Configured =
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_ACCESS_KEY_ID !== "PLACEHOLDER" &&
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCOUNT_ID !== "PLACEHOLDER";

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

  // Local fallback — upload goes through /api/upload
  return {
    uploadUrl: `/api/upload?key=${encodeURIComponent(storageKey)}`,
    storageKey,
    isLocal: true,
  };
}

export function getPublicUrl(storageKey: string): string {
  if (isR2Configured) {
    return `${process.env.R2_PUBLIC_URL}/${storageKey}`;
  }
  return `/uploads/${storageKey}`;
}
