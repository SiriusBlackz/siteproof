"use client";

import { useEffect, useState } from "react";
import { CloudOff, Cloud } from "lucide-react";
import { getQueueCount } from "@/lib/offline-queue";
import { usePWA } from "@/lib/use-pwa";

export function OfflineQueueIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const { isOnline } = usePWA();

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const count = await getQueueCount();
        if (mounted) setPendingCount(count);
      } catch {
        // IndexedDB may not be available
      }
    }

    poll();
    const interval = setInterval(poll, 5000);

    // Re-poll when coming back online or when SW triggers queue processing
    const onOnline = () => poll();
    const onQueueProcess = () => poll();
    window.addEventListener("online", onOnline);
    window.addEventListener("process-offline-queue", onQueueProcess);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("process-offline-queue", onQueueProcess);
    };
  }, []);

  if (pendingCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
      {isOnline ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <CloudOff className="h-3.5 w-3.5" />
      )}
      {pendingCount} pending
    </div>
  );
}
