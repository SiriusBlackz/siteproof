"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  FolderKanban,
  Plus,
  ListChecks,
  Camera,
  ImageIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  archive: "archived",
  upload: "uploaded",
  link: "linked",
  unlink: "unlinked",
  generate: "generated",
  import: "imported",
};

const ENTITY_LABELS: Record<string, string> = {
  project: "project",
  task: "task",
  evidence: "evidence",
  evidence_link: "link",
  report: "report",
  gps_zone: "GPS zone",
};

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } =
    trpc.dashboard.summary.useQuery();
  const { data: activity = [], isLoading: activityLoading } =
    trpc.dashboard.recentActivity.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your projects and recent activity.
          </p>
        </div>
        <Link
          href="/projects/new"
          className={cn(buttonVariants(), "shrink-0")}
        >
          <Plus className="mr-1 h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projects"
          value={summary?.projects.active ?? "—"}
          subtitle={`${summary?.projects.archived ?? 0} archived`}
          icon={FolderKanban}
          loading={summaryLoading}
        />
        <StatCard
          title="Tasks"
          value={summary?.tasks.total ?? "—"}
          subtitle={
            summary
              ? `${summary.tasks.completed} done, ${summary.tasks.delayed} delayed`
              : ""
          }
          icon={ListChecks}
          loading={summaryLoading}
          alert={summary && summary.tasks.delayed > 0}
        />
        <StatCard
          title="Evidence"
          value={summary?.evidence.total ?? "—"}
          subtitle={`${summary?.evidence.thisWeek ?? 0} this week`}
          icon={ImageIcon}
          loading={summaryLoading}
        />
        <StatCard
          title="Progress"
          value={
            summary && summary.tasks.total > 0
              ? `${Math.round((summary.tasks.completed / summary.tasks.total) * 100)}%`
              : "—"
          }
          subtitle="tasks completed"
          icon={TrendingUp}
          loading={summaryLoading}
        />
      </div>

      {/* Onboarding — first-time user */}
      {!summaryLoading && summary?.projects.total === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold">Welcome to SiteProof</h2>
            <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
              Get started by creating your first project. Upload site photos, link them to programme tasks, and generate professional progress reports.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/projects/new" className={cn(buttonVariants(), "gap-1")}>
                <Plus className="h-4 w-4" />
                Create First Project
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-8 text-xs text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <Camera className="h-5 w-5" />
                <span>1. Capture</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <ListChecks className="h-5 w-5" />
                <span>2. Link</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <TrendingUp className="h-5 w-5" />
                <span>3. Report</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No activity yet. Create a project to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {activity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {entry.user?.name
                            ?.split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">
                          {entry.user?.name ?? "System"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {ACTION_LABELS[entry.action] ?? entry.action}{" "}
                          {entry.metadata && (entry.metadata as Record<string, string>).name
                            ? `"${(entry.metadata as Record<string, string>).name}"`
                            : `a ${ENTITY_LABELS[entry.entityType] ?? entry.entityType}`}
                        </span>
                        {entry.project && (
                          <span className="text-muted-foreground">
                            {" "}
                            in{" "}
                            <Link
                              href={`/projects/${entry.project.id}`}
                              className="text-primary hover:underline"
                            >
                              {entry.project.name}
                            </Link>
                          </span>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {entry.createdAt
                          ? formatRelativeTime(new Date(entry.createdAt))
                          : ""}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/projects"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-start"
                )}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                View Projects
              </Link>
              <Link
                href="/projects/new"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full justify-start"
                )}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </CardContent>
          </Card>

          {/* Delayed tasks alert */}
          {summary && summary.tasks.delayed > 0 && (
            <Card className="mt-4 border-amber-200 dark:border-amber-900/50">
              <CardContent className="flex items-start gap-3 pt-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {summary.tasks.delayed} Delayed Task
                    {summary.tasks.delayed !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review your project tasks to address delays.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  alert,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof FolderKanban;
  loading: boolean;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "h-4 w-4",
            alert ? "text-amber-500" : "text-muted-foreground"
          )}
        />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
