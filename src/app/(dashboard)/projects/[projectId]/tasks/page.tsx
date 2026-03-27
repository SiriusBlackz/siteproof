"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/components/tasks/task-list";
import { TaskFormDialog, type TaskFormValues } from "@/components/tasks/task-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<{
    id: string;
    values: Partial<TaskFormValues>;
  } | null>(null);

  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.task.list.useQuery({
    projectId,
  });

  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId });
      setFormOpen(false);
      toast.success("Task created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId });
      setEditTask(null);
      toast.success("Task updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId });
      toast.success("Task deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderMutation = trpc.task.reorder.useMutation({
    onSuccess: () => utils.task.list.invalidate({ projectId }),
    onError: (err) => toast.error(err.message),
  });

  function handleCreate(values: TaskFormValues) {
    createMutation.mutate({
      projectId,
      name: values.name,
      description: values.description || undefined,
      parentTaskId: values.parentTaskId || null,
      plannedStart: values.plannedStart || undefined,
      plannedEnd: values.plannedEnd || undefined,
      status: values.status,
      progressPct: values.progressPct,
    });
  }

  function handleUpdate(values: TaskFormValues) {
    if (!editTask) return;
    updateMutation.mutate({
      id: editTask.id,
      name: values.name,
      description: values.description || null,
      parentTaskId: values.parentTaskId || null,
      plannedStart: values.plannedStart || null,
      plannedEnd: values.plannedEnd || null,
      status: values.status,
      progressPct: values.progressPct,
    });
  }

  function handleEdit(task: {
    id: string;
    parentTaskId: string | null;
    name: string;
    description: string | null;
    plannedStart: string | null;
    plannedEnd: string | null;
    progressPct: number | null;
    status: string | null;
  }) {
    setEditTask({
      id: task.id,
      values: {
        name: task.name,
        description: task.description ?? "",
        parentTaskId: task.parentTaskId ?? "",
        plannedStart: task.plannedStart ?? "",
        plannedEnd: task.plannedEnd ?? "",
        status: (task.status as TaskFormValues["status"]) ?? "not_started",
        progressPct: task.progressPct ?? 0,
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <TaskList
        tasks={tasks}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate({ id })}
        onReorder={(items) => reorderMutation.mutate({ items })}
      />

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        tasks={tasks}
        isSubmitting={createMutation.isPending}
      />

      <TaskFormDialog
        open={editTask !== null}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
        onSubmit={handleUpdate}
        defaultValues={editTask?.values}
        tasks={tasks}
        isSubmitting={updateMutation.isPending}
        editTaskId={editTask?.id}
      />
    </div>
  );
}
