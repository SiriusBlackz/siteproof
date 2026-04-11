"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { ProjectForm, type ProjectFormValues } from "@/components/projects/project-form";
import { toast } from "sonner";
import { BillingBanner } from "@/components/projects/billing-banner";
import { ProjectBreadcrumb } from "@/components/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Trash2 } from "lucide-react";

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: project, isLoading } = trpc.project.get.useQuery({
    id: params.projectId,
  });

  const { data: members = [] } = trpc.project.memberList.useQuery({
    projectId: params.projectId,
  });

  const { data: orgUsers = [] } = trpc.project.orgUsers.useQuery();

  const [addUserId, setAddUserId] = useState<string>("");
  const [pendingRemoval, setPendingRemoval] = useState<{
    userId: string;
    name: string;
  } | null>(null);

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

  const addMember = trpc.project.memberAdd.useMutation({
    onSuccess: () => {
      toast.success("Member added");
      setAddUserId("");
      utils.project.memberList.invalidate({ projectId: params.projectId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeMember = trpc.project.memberRemove.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      setPendingRemoval(null);
      utils.project.memberList.invalidate({ projectId: params.projectId });
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

  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableUsers = orgUsers.filter((u) => !memberUserIds.has(u.id));

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

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members added yet. Add team members to collaborate on this project.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {member.user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{member.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {member.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setPendingRemoval({
                          userId: member.userId,
                          name: member.user.name,
                        })
                      }
                      disabled={removeMember.isPending}
                      aria-label={`Remove ${member.user.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {availableUsers.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Select value={addUserId} onValueChange={(val) => setAddUserId(val ?? "")}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a team member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!addUserId || addMember.isPending}
                onClick={() =>
                  addMember.mutate({
                    projectId: params.projectId,
                    userId: addUserId,
                  })
                }
              >
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
              <Button
                size="sm"
                onClick={() => portalSession.mutate()}
                disabled={portalSession.isPending}
              >
                {portalSession.isPending ? "Loading..." : "Manage Billing"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your subscription, update payment methods, or view invoices
            through the Stripe billing portal.
          </p>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval
                ? `${pendingRemoval.name} will lose access to this project. This doesn't delete their account.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingRemoval) return;
                removeMember.mutate({
                  projectId: params.projectId,
                  userId: pendingRemoval.userId,
                });
              }}
              disabled={removeMember.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
