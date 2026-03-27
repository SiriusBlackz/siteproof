"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2 } from "lucide-react";
import type { Project } from "@/types/project";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{project.name}</CardTitle>
            <Badge
              variant="secondary"
              className={statusColors[project.status ?? "active"]}
            >
              {project.status ?? "active"}
            </Badge>
          </div>
          {project.reference && (
            <p className="text-sm text-muted-foreground">
              Ref: {project.reference}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {project.clientName && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {project.clientName}
            </div>
          )}
          {(project.startDate || project.endDate) && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {project.startDate ?? "—"} → {project.endDate ?? "—"}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
