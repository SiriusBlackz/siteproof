import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { projects, projectMembers, users } from "@/server/db/schema";
import type { db as dbType } from "@/server/db";

type DB = typeof dbType;

/**
 * Verify the project exists, belongs to the user's organisation,
 * and the user is either an org admin or a project member.
 * Throws FORBIDDEN if the org doesn't match or user lacks access, NOT_FOUND if missing.
 */
export async function assertProjectAccess(
  db: DB,
  projectId: string,
  orgId: string,
  userId?: string | null
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

  // If userId provided, check that user is an org admin or a project member
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });
    // Org admins can access all projects in their org
    if (user?.role === "admin") return project;

    // Otherwise, must be a project member
    const membership = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ),
      columns: { id: true },
    });
    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this project" });
    }
  }

  return project;
}
