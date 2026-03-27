import { createTRPCRouter } from "../index";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { evidenceRouter } from "./evidence";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  task: taskRouter,
  evidence: evidenceRouter,
});

export type AppRouter = typeof appRouter;
