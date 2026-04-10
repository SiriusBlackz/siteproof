"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Loader2, FileText, Lock } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  reportNumber: number;
  periodStart: string;
  periodEnd: string;
  status: string | null;
  passwordHash: string | null;
  createdAt: Date | null;
}

interface ReportListProps {
  reports: Report[];
}

export function ReportList({ reports }: ReportListProps) {
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [downloadPassword, setDownloadPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  const downloadQuery = trpc.report.download.useQuery(
    {
      id: downloadId ?? "",
      password: downloadPassword || undefined,
    },
    {
      enabled: !!downloadId && (!needsPassword || !!downloadPassword),
      retry: false,
    }
  );

  // When download URL is available, open it
  if (downloadQuery.data?.url && downloadId) {
    window.open(downloadQuery.data.url, "_blank");
    setDownloadId(null);
    setDownloadPassword("");
    setNeedsPassword(false);
  }

  if (downloadQuery.error && downloadId) {
    const msg = downloadQuery.error.message;
    if (msg === "Password required" && !needsPassword) {
      setNeedsPassword(true);
    } else if (msg !== "Password required") {
      toast.error(msg);
      setDownloadId(null);
      setDownloadPassword("");
      setNeedsPassword(false);
    }
  }

  function handleDownload(report: Report) {
    if (report.passwordHash) {
      setNeedsPassword(true);
      setDownloadId(report.id);
    } else {
      setDownloadId(report.id);
    }
  }

  function handlePasswordSubmit() {
    // The query will re-run with the password
    setNeedsPassword(false);
  }

  if (reports.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <FileText className="mx-auto mb-3 h-8 w-8" />
        No reports generated yet. Click &quot;Generate Report&quot; to create your first one.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Report #</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Protected</TableHead>
            <TableHead>Generated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">#{report.reportNumber}</TableCell>
              <TableCell>
                {report.periodStart} — {report.periodEnd}
              </TableCell>
              <TableCell>
                <StatusBadge status={report.status ?? "generating"} />
              </TableCell>
              <TableCell>
                {report.passwordHash ? (
                  <Lock className="h-4 w-4 text-amber-500" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {report.createdAt
                  ? new Date(report.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={report.status !== "completed"}
                  onClick={() => handleDownload(report)}
                >
                  {downloadId === report.id && downloadQuery.isLoading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-3 w-3" />
                  )}
                  Download
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={needsPassword && !!downloadId}
        onOpenChange={(open) => {
          if (!open) {
            setNeedsPassword(false);
            setDownloadId(null);
            setDownloadPassword("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Password Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter report password"
              value={downloadPassword}
              onChange={(e) => setDownloadPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePasswordSubmit();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handlePasswordSubmit}
              disabled={!downloadPassword}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          Completed
        </Badge>
      );
    case "generating":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        >
          Generating
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="secondary"
          className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        >
          Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
