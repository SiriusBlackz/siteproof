"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  ImageIcon,
  Map,
  FileText,
  Calendar,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/evidence", label: "Evidence", icon: ImageIcon },
  { href: "/zones", label: "Zones", icon: Map },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-px mb-6">
      {navItems.map((item) => {
        const href = `${base}${item.href}`;
        const isActive =
          item.href === ""
            ? pathname === base
            : pathname.startsWith(href);

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 whitespace-nowrap transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
