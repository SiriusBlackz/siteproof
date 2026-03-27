import { createTRPCRouter } from "../index";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { evidenceRouter } from "./evidence";
import { zoneRouter } from "./zone";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  task: taskRouter,
  evidence: evidenceRouter,
  zone: zoneRouter,
});

export type AppRouter = typeof appRouter;
