"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ReportList } from "@/components/reports/report-list";
import { GenerateDialog } from "@/components/reports/generate-dialog";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [generateOpen, setGenerateOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: reports = [], isLoading } = trpc.report.list.useQuery({
    projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-8 w-36 animate-pulse rounded bg-muted" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <Button onClick={() => setGenerateOpen(true)}>
          <FileText className="mr-1 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <ReportList reports={reports} />

      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        projectId={projectId}
        onGenerated={() => utils.report.list.invalidate({ projectId })}
      />
    </div>
  );
}
