"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { usePWA } from "@/lib/use-pwa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DISMISS_KEY = "pwa-install-dismissed";

export function PWAInstallBanner() {
  const { canInstall, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!canInstall || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    const accepted = await promptInstall();
    if (!accepted) {
      // User dismissed the native prompt — don't pester again this session
      sessionStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Download className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install Sitefile on this device</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Get a home-screen icon, full-screen layout, and offline capture
            queue.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>
              Install
            </Button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="text-muted-foreground hover:text-foreground -mt-1"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
