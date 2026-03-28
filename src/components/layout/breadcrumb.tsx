"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function ProjectBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const crumbs: BreadcrumbItem[] = [
    { label: "Projects", href: "/projects" },
    {
      label: project?.name ?? "...",
      href: `/projects/${projectId}`,
    },
    ...items,
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {crumb.href && i < crumbs.length - 1 ? (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
