"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/project-form";
import { toast } from "sonner";
import { BillingBanner } from "@/components/projects/billing-banner";
import { ProjectBreadcrumb } from "@/components/layout/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { data: project, isLoading } = trpc.project.get.useQuery({
    id: params.projectId,
  });

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated");
      router.push(`/projects/${params.projectId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const portalSession = trpc.project.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.portalUrl;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (values: ProjectFormValues) => {
    updateProject.mutate({ id: params.projectId, ...values });
  };

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-lg border bg-muted" />;
  }

  if (!project) {
    return <p className="text-muted-foreground">Project not found.</p>;
  }

  const statusLabel: Record<string, string> = {
    active: "Active",
    pending_payment: "Awaiting Payment",
    payment_failed: "Payment Failed",
    cancelled: "Cancelled",
    archived: "Archived",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ProjectBreadcrumb items={[{ label: "Settings" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground">
          Update project details for {project.name}.
        </p>
      </div>

      <BillingBanner status={project.status} />

      <ProjectForm
        defaultValues={{
          name: project.name,
          reference: project.reference ?? "",
          clientName: project.clientName ?? "",
          contractType: project.contractType ?? "",
          startDate: project.startDate ?? "",
          endDate: project.endDate ?? "",
          reportingFrequency: project.reportingFrequency ?? "monthly",
        }}
        onSubmit={handleSubmit}
        isSubmitting={updateProject.isPending}
        submitLabel="Update Project"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Status: </span>
              <span className="font-medium">
                {statusLabel[project.status ?? "active"] ?? project.status}
              </span>
            </div>
            {project.stripeSubscriptionId && (
              <button
                onClick={() => portalSession.mutate()}
                disabled={portalSession.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {portalSession.isPending ? "Loading..." : "Manage Billing"}
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your subscription, update payment methods, or view invoices
            through the Stripe billing portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
