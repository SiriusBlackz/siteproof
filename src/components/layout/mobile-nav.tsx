"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FolderKanban,
  HardHat,
  Menu,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden flex h-14 items-center border-b px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger>
          <span className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <Menu className="h-5 w-5" />
          </span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <HardHat className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">SiteProof</span>
          </div>
          <nav className="space-y-1 p-2">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2 ml-2">
        <HardHat className="h-5 w-5 text-primary" />
        <span className="font-semibold">SiteProof</span>
      </div>
    </div>
  );
}
