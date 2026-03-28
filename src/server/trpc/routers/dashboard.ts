import { eq, desc, sql, and, gte, inArray } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../index";
import {
  projects,
  tasks,
  evidence,
  auditLog,
} from "@/server/db/schema";

export const dashboardRouter = createTRPCRouter({
  summary: protectedProcedure.query(async ({ ctx }) => {
    // Project counts with SQL aggregation
    const projectStats = await ctx.db
      .select({
        status: projects.status,
        count: sql<number>`count(*)::int`,
      })
      .from(projects)
      .where(eq(projects.orgId, ctx.orgId))
      .groupBy(projects.status);

    const projectCounts = { total: 0, active: 0, archived: 0 };
    for (const row of projectStats) {
      projectCounts.total += row.count;
      if (row.status === "active") projectCounts.active = row.count;
      if (row.status === "archived") projectCounts.archived = row.count;
    }

    // Get project IDs for sub-queries (just IDs, not full rows)
    const orgProjectIds = await ctx.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.orgId, ctx.orgId));
    const projectIds = orgProjectIds.map((p) => p.id);

    if (projectIds.length === 0) {
      return {
        projects: projectCounts,
        tasks: { total: 0, completed: 0, delayed: 0 },
        evidence: { total: 0, thisWeek: 0 },
      };
    }

    // Task stats with SQL aggregation
    const taskStats = await ctx.db
      .select({
        status: tasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(inArray(tasks.projectId, projectIds))
      .groupBy(tasks.status);

    const taskCounts = { total: 0, completed: 0, delayed: 0 };
    for (const row of taskStats) {
      taskCounts.total += row.count;
      if (row.status === "completed") taskCounts.completed = row.count;
      if (row.status === "delayed") taskCounts.delayed = row.count;
    }

    // Evidence counts with SQL aggregation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [evidenceStats] = await ctx.db
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${evidence.createdAt} >= ${sevenDaysAgo})::int`,
      })
      .from(evidence)
      .where(inArray(evidence.projectId, projectIds));

    return {
      projects: projectCounts,
      tasks: taskCounts,
      evidence: {
        total: evidenceStats?.total ?? 0,
        thisWeek: evidenceStats?.thisWeek ?? 0,
      },
    };
  }),

  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    // Get project IDs for this org (just IDs)
    const orgProjectIds = await ctx.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.orgId, ctx.orgId));
    const projectIds = orgProjectIds.map((p) => p.id);

    if (projectIds.length === 0) return [];

    const entries = await ctx.db.query.auditLog.findMany({
      where: inArray(auditLog.projectId, projectIds),
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
