import { createTRPCRouter } from "../index";
import { projectRouter } from "./project";

export const appRouter = createTRPCRouter({
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
