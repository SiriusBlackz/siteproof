"use client";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertCircle, Clock, XCircle } from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { message: string; variant: string; icon: typeof AlertCircle }
> = {
  payment_failed: {
    message: "Payment failed for this project. Please update your billing details.",
    variant:
      "border-l-4 border-red-600 bg-red-100/60 text-red-900 dark:border-red-500 dark:bg-red-950/30 dark:text-red-200",
    icon: AlertCircle,
  },
  pending_payment: {
    message: "This project is awaiting payment. Complete checkout to activate it.",
    variant:
      "border-l-4 border-amber-500 bg-amber-100/50 text-amber-900 dark:border-amber-400 dark:bg-amber-950/30 dark:text-amber-200",
    icon: Clock,
  },
  cancelled: {
    message: "The subscription for this project has been cancelled.",
    variant:
      "border-l-4 border-gray-400 bg-gray-100/60 text-gray-800 dark:border-gray-500 dark:bg-gray-900/40 dark:text-gray-200",
    icon: XCircle,
  },
};

export function BillingBanner({ status }: { status: string | null }) {
  const config = status ? STATUS_CONFIG[status] : null;
  const portalSession = trpc.project.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.portalUrl;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`rounded-md border p-4 ${config.variant}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{config.message}</p>
        </div>
        {status === "payment_failed" && (
          <button
            onClick={() => portalSession.mutate()}
            disabled={portalSession.isPending}
            className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {portalSession.isPending ? "Loading..." : "Manage Billing"}
          </button>
        )}
      </div>
    </div>
  );
}
