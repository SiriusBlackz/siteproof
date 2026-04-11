import { Inngest } from "inngest";

// Treat placeholder values as "unset" so Inngest falls back to local dev mode
// (http://localhost:8288) instead of failing with an invalid cloud key.
const rawEventKey = process.env.INNGEST_EVENT_KEY;
const eventKey =
  rawEventKey && rawEventKey !== "PLACEHOLDER" && rawEventKey.length > 12
    ? rawEventKey
    : undefined;

export const inngest = new Inngest({
  id: "siteproof",
  eventKey,
});
