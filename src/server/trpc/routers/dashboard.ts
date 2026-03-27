import { eq, desc, count, sql, and, gte } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../index";
import {
  projects,
  tasks,
  evidence,
  reports,
  auditLog,
  users,
} from "@/server/db/schema";

export const dashboardRouter = createTRPCRouter({
  summary: protectedProcedure.query(async ({ ctx }) => {
    // Project counts
    const allProjects = await ctx.db.query.projects.findMany({
      where: eq(projects.orgId, ctx.orgId),
      columns: { id: true, status: true },
    });
    const activeProjects = allProjects.filter((p) => p.status === "active").length;
    const archivedProjects = allProjects.filter((p) => p.status === "archived").length;

    // Task stats across all org projects
    const projectIds = allProjects.map((p) => p.id);
    let totalTasks = 0;
    let completedTasks = 0;
    let delayedTasks = 0;
    let totalEvidence = 0;
    let recentEvidence = 0;

    if (projectIds.length > 0) {
      const allTasks = await ctx.db.query.tasks.findMany({
        where: sql`${tasks.projectId} IN ${projectIds}`,
        columns: { status: true },
      });
      totalTasks = allTasks.length;
      completedTasks = allTasks.filter((t) => t.status === "completed").length;
      delayedTasks = allTasks.filter((t) => t.status === "delayed").length;

      // Evidence counts
      const allEvidence = await ctx.db.query.evidence.findMany({
        where: sql`${evidence.projectId} IN ${projectIds}`,
        columns: { id: true, createdAt: true },
      });
      totalEvidence = allEvidence.length;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      recentEvidence = allEvidence.filter(
        (e) => e.createdAt && e.createdAt >= sevenDaysAgo
      ).length;
    }

    return {
      projects: {
        total: allProjects.length,
        active: activeProjects,
        archived: archivedProjects,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        delayed: delayedTasks,
      },
      evidence: {
        total: totalEvidence,
        thisWeek: recentEvidence,
      },
    };
  }),

  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    // Get project IDs for this org
    const orgProjects = await ctx.db.query.projects.findMany({
      where: eq(projects.orgId, ctx.orgId),
      columns: { id: true },
    });
    const projectIds = orgProjects.map((p) => p.id);

    if (projectIds.length === 0) return [];

    const entries = await ctx.db.query.auditLog.findMany({
      where: sql`${auditLog.projectId} IN ${projectIds}`,
      orderBy: [desc(auditLog.createdAt)],
      limit: 15,
      with: {
        user: { columns: { id: true, name: true, avatarUrl: true } },
        project: { columns: { id: true, name: true } },
      },
    });

    return entries.map((e) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      metadata: e.metadata as Record<string, unknown> | null,
      createdAt: e.createdAt,
      user: e.user ? { name: e.user.name, avatarUrl: e.user.avatarUrl } : null,
      project: e.project ? { id: e.project.id, name: e.project.name } : null,
    }));
  }),
});
