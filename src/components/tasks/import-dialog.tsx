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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImportComplete: () => void;
}

interface ParsedTaskPreview {
  sourceRef: string;
  name: string;
  parentSourceRef: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  progressPct: number;
  sortOrder: number;
}

interface PreviewData {
  format: string;
  tasks: ParsedTaskPreview[];
}

interface ColumnMapping {
  name: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  progressPct: string | null;
  wbs: string | null;
  parent: string | null;
}

interface MappingStep {
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
}

const NONE = "__none__";

export function ImportDialog({
  open,
  onOpenChange,
  projectId,
  onImportComplete,
}: ImportDialogProps) {
  // Source data — only one of (xmlContent, xlsxBase64) is set at a time.
  const [xmlContent, setXmlContent] = useState<string>("");
  const [xlsxBase64, setXlsxBase64] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  // Wizard state
  const [mappingStep, setMappingStep] = useState<MappingStep | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const [clearExisting, setClearExisting] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = trpc.task.previewImport.useMutation({
    onSuccess: (data) => {
      setError("");
      if (data.kind === "needs_mapping") {
        setMappingStep({
          headers: data.headers,
          sampleRows: data.sampleRows,
          totalRows: data.totalRows,
        });
        setMapping(data.suggested);
      } else {
        setPreview({ format: data.format, tasks: data.tasks });
        setMappingStep(null);
      }
    },
    onError: (err) => {
      setError(err.message);
      setPreview(null);
      setMappingStep(null);
    },
  });

  const importMutation = trpc.task.import.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} tasks`);
      handleClose();
      onImportComplete();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleFileSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);

    const isXlsx = /\.xlsx$/i.test(file.name);
    const reader = new FileReader();
    if (isXlsx) {
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result !== "string") return;
        // result is "data:...;base64,XXXX"
        const b64 = result.split(",")[1] ?? "";
        setXlsxBase64(b64);
        previewMutation.mutate({ kind: "xlsx-inspect", xlsxBase64: b64 });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (e) => {
        const xml = e.target?.result as string;
        setXmlContent(xml);
        previewMutation.mutate({ kind: "xml", xml });
      };
      reader.readAsText(file);
    }
  }

  function handleConfirmMapping() {
    if (!mapping || !xlsxBase64) return;
    if (!mapping.name) {
      toast.error("Pick a column for Task Name.");
      return;
    }
    previewMutation.mutate({
      kind: "xlsx-parse",
      xlsxBase64,
      mapping,
    });
  }

  function handleImport() {
    if (xmlContent) {
      importMutation.mutate({
        projectId,
        clearExisting,
        source: { kind: "xml", xml: xmlContent },
      });
    } else if (xlsxBase64 && mapping) {
      importMutation.mutate({
        projectId,
        clearExisting,
        source: { kind: "xlsx", xlsxBase64, mapping },
      });
    }
  }

  function handleClose() {
    setXmlContent("");
    setXlsxBase64("");
    setFileName("");
    setMappingStep(null);
    setMapping(null);
    setPreview(null);
    setError("");
    setClearExisting(false);
    onOpenChange(false);
  }

  function getDepth(
    task: ParsedTaskPreview,
    allTasks: ParsedTaskPreview[]
  ): number {
    let depth = 0;
    let current = task;
    const seen = new Set<string>();
    while (current.parentSourceRef && !seen.has(current.sourceRef)) {
      seen.add(current.sourceRef);
      const parent = allTasks.find(
        (t) => t.sourceRef === current.parentSourceRef
      );
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  }

  const formatLabel: Record<string, string> = {
    msproject: "MS Project",
    p6: "Primavera P6",
    xlsx: "Excel",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Programme</DialogTitle>
        </DialogHeader>

        {/* Step 1: file picker */}
        {!mappingStep && !preview && !error && (
          <div className="space-y-3">
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {fileName || "Select an Excel (.xlsx) or XML programme"}
              </p>
              <p className="text-xs text-muted-foreground/70">
                MS Project users: File → Save As → XML
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,.xlsx"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>
          </div>
        )}

        {previewMutation.isPending && (
          <div className="py-8 text-center text-muted-foreground">
            {xlsxBase64 ? "Reading spreadsheet..." : "Parsing XML..."}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Parse Error
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Step 2: column mapping (xlsx only) */}
        {mappingStep && mapping && !preview && (
          <div className="space-y-4">
            <div className="text-sm">
              <Badge variant="secondary">Excel</Badge>
              <span className="text-muted-foreground ml-2">
                {mappingStep.totalRows} data rows in {fileName}. Map your
                columns:
              </span>
            </div>

            <div className="space-y-2">
              <MappingRow
                label="Task name *"
                required
                headers={mappingStep.headers}
                value={mapping.name}
                onChange={(v) => setMapping({ ...mapping, name: v ?? "" })}
              />
              <MappingRow
                label="Start date"
                headers={mappingStep.headers}
                value={mapping.plannedStart}
                onChange={(v) =>
                  setMapping({ ...mapping, plannedStart: v ?? null })
                }
              />
              <MappingRow
                label="End date"
                headers={mappingStep.headers}
                value={mapping.plannedEnd}
                onChange={(v) =>
                  setMapping({ ...mapping, plannedEnd: v ?? null })
                }
              />
              <MappingRow
                label="% Complete"
                headers={mappingStep.headers}
                value={mapping.progressPct}
                onChange={(v) =>
                  setMapping({ ...mapping, progressPct: v ?? null })
                }
              />
              <MappingRow
                label="WBS code"
                hint="Used for hierarchy (e.g. 1.1, 1.1.2)"
                headers={mappingStep.headers}
                value={mapping.wbs}
                onChange={(v) => setMapping({ ...mapping, wbs: v ?? null })}
              />
            </div>

            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Sample rows</summary>
              <div className="mt-2 overflow-x-auto rounded-lg border max-h-40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {mappingStep.headers.map((h) => (
                        <TableHead key={h} className="text-xs">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappingStep.sampleRows.map((row, i) => (
                      <TableRow key={i}>
                        {mappingStep.headers.map((h) => (
                          <TableCell key={h} className="text-xs">
                            {row[h] ?? ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          </div>
        )}

        {/* Step 3: preview */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {formatLabel[preview.format] ?? preview.format}
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
                setXlsxBase64("");
                setFileName("");
              }}
            >
              Try Another File
            </Button>
          )}
          {mappingStep && !preview && (
            <Button
              onClick={handleConfirmMapping}
              disabled={previewMutation.isPending || !mapping?.name}
            >
              {previewMutation.isPending ? "Reading..." : "Preview tasks"}
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

interface MappingRowProps {
  label: string;
  hint?: string;
  required?: boolean;
  headers: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}

function MappingRow({
  label,
  hint,
  required,
  headers,
  value,
  onChange,
}: MappingRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0">
        <Label className="text-sm">{label}</Label>
        {hint && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
        )}
      </div>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? null : (v ?? null))}
      >
        <SelectTrigger className="flex-1">
          <SelectValue
            placeholder={required ? "Pick a column..." : "Skip"}
          />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value={NONE}>Skip</SelectItem>}
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
