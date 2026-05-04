"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ListChecks, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NextStepBannerProps {
  projectId: string;
  taskCount: number;
  evidenceCount: number;
}

export function NextStepBanner({
  projectId,
  taskCount,
  evidenceCount,
}: NextStepBannerProps) {
  const dismissKey = `next-step-dismiss-${projectId}`;
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem(dismissKey)) {
      setDismissed(true);
    }
  }, [dismissKey]);

  if (!mounted || dismissed) return null;

  let step: {
    title: string;
    body: string;
    actions: { label: string; href: string; variant?: "outline" }[];
    icon: typeof ListChecks;
  } | null = null;

  if (taskCount === 0) {
    step = {
      title: "Start with your programme",
      body: "Add tasks manually or import an MS Project / P6 XML so progress can be tracked.",
      actions: [
        { label: "Add tasks", href: `/projects/${projectId}/tasks` },
      ],
      icon: ListChecks,
    };
  } else if (evidenceCount === 0) {
    step = {
      title: "Capture site evidence",
      body: "Open the mobile capture flow on a phone to upload photos with GPS + EXIF, or use the desktop uploader.",
      actions: [
        { label: "Open capture", href: `/capture?projectId=${projectId}` },
        {
          label: "Upload from desktop",
          href: `/projects/${projectId}/evidence`,
          variant: "outline",
        },
      ],
      icon: Camera,
    };
  }

  if (!step) return null;

  const dismiss = () => {
    sessionStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  const Icon = step.icon;

  return (
    <Card className="border-blue-300 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{step.title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{step.body}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {step.actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={cn(
                  buttonVariants({
                    variant: a.variant ?? "default",
                    size: "sm",
                  })
                )}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss next step"
          className="text-muted-foreground hover:text-foreground -mt-1"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
