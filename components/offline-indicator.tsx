"use client";

import { useEffect, useState } from "react";
import { WifiOff, Check } from "lucide-react";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { useBackgroundSync } from "@/lib/offline/use-background-sync";
import { getQueueCount } from "@/lib/offline/upload-queue";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [showSynced, setShowSynced] = useState(false);

  useBackgroundSync();

  // Poll queue count when offline
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const update = () => {
      getQueueCount().then(setQueueCount);
    };

    update();
    if (!isOnline) {
      interval = setInterval(update, 2000);
    }

    return () => clearInterval(interval);
  }, [isOnline]);

  // Listen for sync-complete events
  useEffect(() => {
    const handler = (e: Event) => {
      const { synced } = (e as CustomEvent).detail;
      setSyncedCount(synced);
      setShowSynced(true);
      setQueueCount(0);

      const timer = setTimeout(() => {
        setShowSynced(false);
        setSyncedCount(0);
      }, 4000);

      return () => clearTimeout(timer);
    };

    window.addEventListener("cantrip:sync-complete", handler);
    return () => window.removeEventListener("cantrip:sync-complete", handler);
  }, []);

  if (isOnline && !showSynced) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
      {!isOnline ? (
        <div className="flex items-center gap-2 rounded-full bg-yellow-500/90 px-4 py-1.5 text-sm font-medium text-yellow-950 shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
          {queueCount > 0 && (
            <span className="rounded-full bg-yellow-950/20 px-2 py-0.5 text-xs">
              {queueCount} queued
            </span>
          )}
        </div>
      ) : showSynced ? (
        <div className="flex items-center gap-2 rounded-full bg-green-500/90 px-4 py-1.5 text-sm font-medium text-green-950 shadow-lg animate-in fade-in slide-in-from-top-2">
          <Check className="h-4 w-4" />
          <span>
            {syncedCount} upload{syncedCount !== 1 ? "s" : ""} synced
          </span>
        </div>
      ) : null}
    </div>
  );
}
