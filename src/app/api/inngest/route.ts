import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import { generateReport } from "@/server/inngest/functions/generate-report";
import { processUpload } from "@/server/inngest/functions/process-upload";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateReport, processUpload],
});
