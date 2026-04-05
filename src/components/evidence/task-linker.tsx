"use client";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

interface TaskSuggestion {
  taskId: string;
  taskName: string;
  confidence: number;
  reasons: string[];
}

interface TaskLinkerProps {
  evidenceId: string;
  projectId: string;
  linkedTaskIds: string[];
  suggestions?: TaskSuggestion[];
}

export function TaskLinker({
  evidenceId,
  projectId,
  linkedTaskIds,
  suggestions,
}: TaskLinkerProps) {
  const utils = trpc.useUtils();
  const { data: tasks = [] } = trpc.task.list.useQuery({ projectId });

  const linkMutation = trpc.evidence.link.useMutation({
    onSuccess: () => {
      utils.evidence.list.invalidate();
      toast.success("Task linked");
    },
    onError: (err) => toast.error(err.message),
  });

  const unlinkMutation = trpc.evidence.unlink.useMutation({
    onSuccess: () => {
      utils.evidence.list.invalidate();
      toast.success("Task unlinked");
    },
    onError: (err) => toast.error(err.message),
  });

  const availableTasks = tasks.filter((t) => !linkedTaskIds.includes(t.id));
  const linkedTasks = tasks.filter((t) => linkedTaskIds.includes(t.id));

  // Filter suggestions to only show unlinked tasks
  const activeSuggestions = suggestions?.filter(
    (s) => !linkedTaskIds.includes(s.taskId)
  );

  function handleLink(
    taskId: string,
    method: "manual" | "ai_suggested" = "manual",
    confidence?: number
  ) {
    linkMutation.mutate({
      evidenceId,
      taskId,
      linkMethod: method,
      aiConfidence: confidence,
    });
  }

  function handleUnlink(taskId: string) {
    const taskName = linkedTasks.find((t) => t.id === taskId)?.name ?? "task";
    toast(`Unlink "${taskName}"?`, {
      action: {
        label: "Confirm",
        onClick: () => unlinkMutation.mutate({ evidenceId, taskId }),
      },
      duration: 5000,
    });
  }

  function confidenceColor(c: number) {
    if (c >= 0.7) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (c >= 0.4) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }

  return (
    <div className="space-y-3">
      {linkedTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Linked Tasks
          </p>
          <div className="flex flex-wrap gap-1">
            {linkedTasks.map((t) => (
              <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
                {t.name}
                <button
                  onClick={() => handleUnlink(t.id)}
                  className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {activeSuggestions && activeSuggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Suggestions
          </p>
          <div className="space-y-1">
            {activeSuggestions.map((s) => (
              <button
                key={s.taskId}
                className="flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm hover:bg-muted/50 transition-colors"
                onClick={() =>
                  handleLink(s.taskId, "ai_suggested", s.confidence)
                }
              >
                <Badge
                  variant="secondary"
                  className={`text-[10px] shrink-0 ${confidenceColor(s.confidence)}`}
                >
                  {Math.round(s.confidence * 100)}%
                </Badge>
                <span className="truncate">{s.taskName}</span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {s.reasons[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {availableTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Link a Task
          </p>
          <Select
            value=""
            onValueChange={(val) => {
              if (val) handleLink(val);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a task..." />
            </SelectTrigger>
            <SelectContent>
              {availableTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {"—".repeat(t.depth)} {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
