"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderKanban,
  HardHat,
  UserRound,
} from "lucide-react";
import { OfflineQueueIndicator } from "./offline-queue-indicator";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { CaptureLauncher } from "@/components/capture/capture-launcher";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/account", label: "Account", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <HardHat className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Sitefile</span>
      </div>
      <div className="px-2 pt-2">
        <CaptureLauncher variant="primary" />
      </div>
      <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
        Press <kbd className="font-mono text-[10px] border rounded px-1 py-0.5 ml-0.5">⌘K</kbd> to search
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
                "w-full justify-start gap-2"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 flex items-center justify-between gap-2">
        <OfflineQueueIndicator />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </aside>
  );
}
