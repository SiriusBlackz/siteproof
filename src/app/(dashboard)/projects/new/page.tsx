"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/project-form";
import { toast } from "sonner";

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = trpc.project.create.useMutation({
    onSuccess: (project) => {
      toast.success("Project created");
      router.push(`/projects/${project.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (values: ProjectFormValues) => {
    createProject.mutate(values);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Project</h1>
        <p className="text-muted-foreground">
          Set up a new construction project to track progress.
        </p>
      </div>
      <ProjectForm
        onSubmit={handleSubmit}
        isSubmitting={createProject.isPending}
      />
    </div>
  );
}
