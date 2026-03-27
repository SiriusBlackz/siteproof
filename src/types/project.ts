import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { projects } from "@/server/db/schema";

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
