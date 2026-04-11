import { inngest } from "../client";
import { db } from "@/server/db";
import { evidence } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const processUpload = inngest.createFunction(
  {
    id: "process-upload",
    retries: 2,
    triggers: [{ event: "evidence/uploaded" }],
  },
  async ({ event, step }) => {
    const { evidenceId } = event.data as { evidenceId: string };

    // Step 1: Fetch the evidence record
    const record = await step.run("fetch-evidence", async () => {
      const item = await db.query.evidence.findFirst({
        where: eq(evidence.id, evidenceId),
      });
      if (!item) throw new Error(`Evidence ${evidenceId} not found`);
      return item;
    });

    // Step 2: Generate thumbnail (photos only)
    if (record.type === "photo") {
      const thumbnailKey = await step.run("generate-thumbnail", async () => {
        const { getPublicUrl } = await import("@/server/services/storage");
        const url = getPublicUrl(record.storageKey);

        // Fetch the original image
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

        let imageBuffer: Buffer;
        try {
          const res = await fetch(fullUrl);
          if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
          imageBuffer = Buffer.from(await res.arrayBuffer());
        } catch {
          console.warn(`[process-upload] Could not fetch image for thumbnail: ${fullUrl}`);
          return null;
        }

        // Generate thumbnail with sharp
        let sharp: typeof import("sharp");
        try {
          sharp = (await import("sharp")).default;
        } catch {
          console.warn("[process-upload] sharp not available, skipping thumbnail");
          return null;
        }

        const thumbBuffer = await sharp(imageBuffer)
          .resize(400, 400, { fit: "cover", position: "centre" })
          .jpeg({ quality: 75 })
          .toBuffer();

        // Write thumbnail to storage
        const thumbKey = record.storageKey.replace(
          /\/([^/]+)$/,
          "/thumb_$1"
        );

        const isR2 =
          process.env.R2_ACCESS_KEY_ID &&
          process.env.R2_ACCESS_KEY_ID !== "PLACEHOLDER";

        if (isR2) {
          const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
          const client = new S3Client({
            region: "auto",
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: process.env.R2_ACCESS_KEY_ID!,
              secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
            },
          });
          await client.send(
            new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME!,
              Key: thumbKey,
              Body: thumbBuffer,
              ContentType: "image/jpeg",
            })
          );
        } else {
          // Local fallback
          const { writeFile, mkdir } = await import("fs/promises");
          const { join, dirname } = await import("path");
          const uploadDir = process.env.VERCEL
            ? "/tmp/uploads"
            : join(process.cwd(), ".local-uploads");
          const filePath = join(uploadDir, thumbKey);
          await mkdir(dirname(filePath), { recursive: true });
          await writeFile(filePath, thumbBuffer);
        }

        return thumbKey;
      });

      // Step 3: Update evidence record with thumbnail
      if (thumbnailKey) {
        await step.run("update-thumbnail", async () => {
          await db
            .update(evidence)
            .set({ thumbnailKey })
            .where(eq(evidence.id, evidenceId));
        });
      }
    }

    return { evidenceId, processed: true };
  }
);
