import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "siteproof",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
