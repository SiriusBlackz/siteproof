import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FolderKanban, Plus } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to SiteProof — your contractor progress evidence tracker.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/projects"
              className={cn(buttonVariants(), "w-full")}
            >
              <FolderKanban className="mr-2 h-4 w-4" />
              View Projects
            </Link>
            <Link
              href="/projects/new"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
