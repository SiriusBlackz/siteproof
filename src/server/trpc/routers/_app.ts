import { createTRPCRouter } from "../index";
import { projectRouter } from "./project";
import { taskRouter } from "./task";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
