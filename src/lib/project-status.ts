export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pending_payment: "Awaiting Payment",
  payment_failed: "Payment Failed",
  cancelled: "Cancelled",
  archived: "Archived",
  completed: "Completed",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  pending_payment:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  payment_failed:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
};

export function getProjectStatusLabel(status: string | null | undefined): string {
  if (!status) return PROJECT_STATUS_LABELS.active;
  return PROJECT_STATUS_LABELS[status] ?? status;
}

export function getProjectStatusColor(status: string | null | undefined): string {
  return PROJECT_STATUS_COLORS[status ?? "active"] ?? PROJECT_STATUS_COLORS.active;
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
};

export function getTaskStatusLabel(status: string | null | undefined): string {
  if (!status) return TASK_STATUS_LABELS.not_started;
  return TASK_STATUS_LABELS[status] ?? status;
}
