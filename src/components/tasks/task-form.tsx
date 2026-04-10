"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  parentTaskId: z.string().optional(),
  plannedStart: z.string().optional(),
  plannedEnd: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "delayed"]),
  progressPct: z.number().min(0).max(100),
}).refine(
  (data) => !data.plannedStart || !data.plannedEnd || data.plannedEnd >= data.plannedStart,
  { message: "End date must be after start date", path: ["plannedEnd"] }
);

export type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskOption {
  id: string;
  name: string;
  depth: number;
}

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TaskFormValues) => void;
  defaultValues?: Partial<TaskFormValues>;
  tasks: TaskOption[];
  isSubmitting?: boolean;
  editTaskId?: string | null;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  tasks,
  isSubmitting,
  editTaskId,
}: TaskFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      parentTaskId: "",
      plannedStart: "",
      plannedEnd: "",
      status: "not_started",
      progressPct: 0,
      ...defaultValues,
    },
  });

  // Filter out the task being edited (and its descendants) from parent options
  const parentOptions = tasks.filter((t) => t.id !== editTaskId);

  function handleFormSubmit(values: TaskFormValues) {
    onSubmit(values);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editTaskId ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-name">Task Name *</Label>
            <Input
              id="task-name"
              {...register("name")}
              placeholder="e.g. Foundation excavation"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              {...register("description")}
              placeholder="Optional description..."
            />
          </div>

          <div className="space-y-2">
            <Label>Parent Task</Label>
            <Select
              // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch()
              value={watch("parentTaskId") ?? ""}
              onValueChange={(val) =>
                setValue("parentTaskId", val === "__none__" ? "" : (val ?? ""))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (top-level)</SelectItem>
                {parentOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {"—".repeat(t.depth)} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(val) =>
                  setValue(
                    "status",
                    (val as TaskFormValues["status"]) ?? "not_started"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-progress">Progress %</Label>
              <Input
                id="task-progress"
                type="number"
                min={0}
                max={100}
                {...register("progressPct", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-start">Planned Start</Label>
              <Input
                id="task-start"
                type="date"
                {...register("plannedStart")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-end">Planned End</Label>
              <Input id="task-end" type="date" {...register("plannedEnd")} />
              {errors.plannedEnd && (
                <p className="text-sm text-destructive">{errors.plannedEnd.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editTaskId ? "Update" : "Add Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
