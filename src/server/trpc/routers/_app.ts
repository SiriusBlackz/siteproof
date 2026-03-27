import { createTRPCRouter } from "../index";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { evidenceRouter } from "./evidence";
import { zoneRouter } from "./zone";
import { reportRouter } from "./report";
import { auditRouter } from "./audit";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  task: taskRouter,
  evidence: evidenceRouter,
  zone: zoneRouter,
  report: reportRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
