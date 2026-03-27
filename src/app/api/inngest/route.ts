import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import { generateReport } from "@/server/inngest/functions/generate-report";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateReport],
});
