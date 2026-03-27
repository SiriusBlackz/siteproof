"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/project-form";
import { toast } from "sonner";

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

  const handleSubmit = (values: ProjectFormValues) => {
    updateProject.mutate({ id: params.projectId, ...values });
  };

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-lg border bg-muted" />;
  }

  if (!project) {
    return <p className="text-muted-foreground">Project not found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground">
          Update project details for {project.name}.
        </p>
      </div>
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
    </div>
  );
}
