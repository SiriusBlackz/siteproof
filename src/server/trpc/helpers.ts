import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { projects } from "@/server/db/schema";
import type { db as dbType } from "@/server/db";

type DB = typeof dbType;

/**
 * Verify the project exists and belongs to the user's organisation.
 * Throws FORBIDDEN if the org doesn't match, NOT_FOUND if missing.
 */
export async function assertProjectAccess(
  db: DB,
  projectId: string,
  orgId: string
) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { id: true, orgId: true },
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  if (project.orgId !== orgId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
  return project;
}
