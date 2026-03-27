import { createTRPCRouter } from "../index";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { evidenceRouter } from "./evidence";
import { zoneRouter } from "./zone";
import { reportRouter } from "./report";
import { auditRouter } from "./audit";
import { dashboardRouter } from "./dashboard";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  task: taskRouter,
  evidence: evidenceRouter,
  zone: zoneRouter,
  report: reportRouter,
  audit: auditRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
