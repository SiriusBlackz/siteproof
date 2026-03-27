"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImportComplete: () => void;
}

interface PreviewData {
  format: string;
  tasks: {
    sourceRef: string;
    name: string;
    parentSourceRef: string | null;
    plannedStart: string | null;
    plannedEnd: string | null;
    progressPct: number;
    sortOrder: number;
  }[];
}

export function ImportDialog({
  open,
  onOpenChange,
  projectId,
  onImportComplete,
}: ImportDialogProps) {
  const [xmlContent, setXmlContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = trpc.task.previewImport.useMutation({
    onSuccess: (data) => {
      setPreview(data);
      setError("");
    },
    onError: (err) => {
      setError(err.message);
      setPreview(null);
    },
  });

  const importMutation = trpc.task.import.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Imported ${data.imported} tasks from ${data.format === "msproject" ? "MS Project" : "P6"} XML`
      );
      handleClose();
      onImportComplete();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleFileSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const xml = e.target?.result as string;
      setXmlContent(xml);
      previewMutation.mutate({ xml });
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!xmlContent) return;
    importMutation.mutate({
      projectId,
      xml: xmlContent,
      clearExisting,
    });
  }

  function handleClose() {
    setXmlContent("");
    setFileName("");
    setPreview(null);
    setError("");
    setClearExisting(false);
    onOpenChange(false);
  }

  // Compute indentation from parentSourceRef
  function getDepth(task: PreviewData["tasks"][0], allTasks: PreviewData["tasks"]): number {
    let depth = 0;
    let current = task;
    while (current.parentSourceRef) {
      const parent = allTasks.find((t) => t.sourceRef === current.parentSourceRef);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Programme</DialogTitle>
        </DialogHeader>

        {!preview && !error && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {fileName || "Select an MS Project XML or Primavera P6 XML file"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        )}

        {previewMutation.isPending && (
          <div className="py-8 text-center text-muted-foreground">
            Parsing XML...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Parse Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {preview.format === "msproject" ? "MS Project" : "Primavera P6"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {preview.tasks.length} tasks found in {fileName}
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.tasks.map((task) => {
                    const depth = getDepth(task, preview.tasks);
                    return (
                      <TableRow key={task.sourceRef}>
                        <TableCell>
                          <span style={{ paddingLeft: `${depth * 16}px` }}>
                            {task.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task.plannedStart ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task.plannedEnd ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {task.progressPct}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="clear-existing"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="clear-existing" className="text-sm font-normal">
                Clear existing tasks before importing
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {error && (
            <Button
              variant="outline"
              onClick={() => {
                setError("");
                setXmlContent("");
                setFileName("");
              }}
            >
              Try Another File
            </Button>
          )}
          {preview && (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending
                ? "Importing..."
                : `Import ${preview.tasks.length} Tasks`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
