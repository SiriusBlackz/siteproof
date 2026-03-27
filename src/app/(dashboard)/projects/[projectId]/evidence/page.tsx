"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EvidenceGrid } from "@/components/evidence/evidence-grid";
import { UploadQueue } from "@/components/evidence/upload-queue";
import { Upload, Filter } from "lucide-react";

export default function EvidencePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const utils = trpc.useUtils();

  const { data: tasks = [] } = trpc.task.list.useQuery({ projectId });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.evidence.list.useInfiniteQuery(
      {
        projectId,
        limit: 24,
        taskId: taskFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }
    );

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  function handleUploadComplete() {
    utils.evidence.list.invalidate();
  }

  function clearFilters() {
    setTaskFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const hasActiveFilters = taskFilter || dateFrom || dateTo;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Evidence</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={hasActiveFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="mr-1 h-4 w-4" />
            Filters
            {hasActiveFilters && " (active)"}
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label className="text-xs">Task</Label>
            <Select
              value={taskFilter}
              onValueChange={(val) => setTaskFilter(val === "__all__" ? "" : (val ?? ""))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All tasks</SelectItem>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {"—".repeat(t.depth)} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      )}

      <EvidenceGrid items={items} />

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
          </DialogHeader>
          <UploadQueue
            projectId={projectId}
            onUploadComplete={handleUploadComplete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
