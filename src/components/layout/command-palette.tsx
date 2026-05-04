"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  FolderKanban,
  UserRound,
  Plus,
  Camera,
  ChevronRight,
  Search,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: typeof LayoutDashboard;
  action: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: projects = [] } = trpc.project.list.useQuery(undefined, {
    enabled: open,
  });

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset query when closing
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const items: CommandItem[] = useMemo(() => {
    const navItems: CommandItem[] = [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        hint: "Go to dashboard",
        icon: LayoutDashboard,
        action: () => navigate("/"),
        keywords: "home overview stats",
      },
      {
        id: "nav-projects",
        label: "Projects",
        hint: "View all projects",
        icon: FolderKanban,
        action: () => navigate("/projects"),
      },
      {
        id: "nav-account",
        label: "Account",
        hint: "Account settings",
        icon: UserRound,
        action: () => navigate("/account"),
        keywords: "profile sign-out logout",
      },
      {
        id: "act-new-project",
        label: "New project",
        hint: "Create a new project",
        icon: Plus,
        action: () => navigate("/projects/new"),
        keywords: "create add",
      },
    ];

    const projectItems: CommandItem[] = projects.map((p) => ({
      id: `project-${p.id}`,
      label: p.name,
      hint: p.reference ?? p.clientName ?? "Project",
      icon: FolderKanban,
      action: () => navigate(`/projects/${p.id}`),
      keywords: `${p.reference ?? ""} ${p.clientName ?? ""}`,
    }));

    const captureItems: CommandItem[] = projects
      .filter((p) => p.status === "active")
      .map((p) => ({
        id: `capture-${p.id}`,
        label: `Capture for ${p.name}`,
        hint: "Open mobile capture",
        icon: Camera,
        action: () => navigate(`/capture?projectId=${p.id}`),
        keywords: "photo upload",
      }));

    return [...navItems, ...projectItems, ...captureItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate is stable per render
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items
      .filter((it) => {
        const hay = `${it.label} ${it.hint ?? ""} ${it.keywords ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 20);
  }, [items, query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or project name..."
            className="border-0 shadow-none focus-visible:ring-0 px-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            esc
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches.
            </p>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:block">
                      {item.hint}
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              );
            })
          )}
        </div>
        <div className="border-t px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            <kbd className="font-mono px-1">⌘K</kbd> to toggle
          </span>
          <span>{filtered.length} results</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
