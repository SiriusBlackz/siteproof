"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  ListTodo,
  Camera,
  Map,
  FileText,
  Calendar,
  Building2,
  FileCheck,
  ClipboardList,
} from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const { data: project, isLoading } = trpc.project.get.useQuery({
    id: params.projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-muted-foreground">Project not found.</p>;
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-800",
    completed: "bg-blue-100 text-blue-800",
  };

  const subPages = [
    { href: `/capture?projectId=${project.id}`, label: "Capture", icon: Camera },
    { href: `/projects/${project.id}/tasks`, label: "Tasks", icon: ListTodo },
    { href: `/projects/${project.id}/evidence`, label: "Evidence", icon: FileCheck },
    { href: `/projects/${project.id}/zones`, label: "GPS Zones", icon: Map },
    { href: `/projects/${project.id}/reports`, label: "Reports", icon: FileText },
    { href: `/projects/${project.id}/audit`, label: "Audit Log", icon: ClipboardList },
    { href: `/projects/${project.id}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            <Badge
              variant="secondary"
              className={statusColors[project.status ?? "active"]}
            >
              {project.status}
            </Badge>
          </div>
          {project.reference && (
            <p className="text-muted-foreground">Ref: {project.reference}</p>
          )}
        </div>
        <Link
          href={`/projects/${project.id}/settings`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {project.clientName && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Client:</span>
              {project.clientName}
            </div>
          )}
          {project.contractType && (
            <div className="flex items-center gap-2 text-sm">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Contract:</span>
              {project.contractType}
            </div>
          )}
          {(project.startDate || project.endDate) && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Period:</span>
              {project.startDate ?? "—"} → {project.endDate ?? "—"}
            </div>
          )}
          {project.reportingFrequency && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Reporting:</span>
              {project.reportingFrequency}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {subPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto flex-col gap-1 py-4"
            )}
          >
            <page.icon className="h-5 w-5" />
            <span className="text-sm">{page.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
