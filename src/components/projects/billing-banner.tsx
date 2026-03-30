"use client";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { message: string; variant: string }> = {
  payment_failed: {
    message: "Payment failed for this project. Please update your billing details.",
    variant: "bg-red-50 border-red-200 text-red-800",
  },
  pending_payment: {
    message: "This project is awaiting payment. Complete checkout to activate it.",
    variant: "bg-amber-50 border-amber-200 text-amber-800",
  },
  cancelled: {
    message: "The subscription for this project has been cancelled.",
    variant: "bg-gray-50 border-gray-200 text-gray-800",
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

  return (
    <div className={`rounded-lg border p-4 ${config.variant}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{config.message}</p>
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
