import { createTRPCRouter } from "../index";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { evidenceRouter } from "./evidence";
import { zoneRouter } from "./zone";
import { reportRouter } from "./report";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  task: taskRouter,
  evidence: evidenceRouter,
  zone: zoneRouter,
  report: reportRouter,
});

export type AppRouter = typeof appRouter;
