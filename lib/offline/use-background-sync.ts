"use client";

import { useEffect, useRef } from "react";
import { useOnlineStatus } from "./use-online-status";
import { processQueue } from "./upload-queue";

export function useBackgroundSync() {
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    if (wasOffline.current) {
      wasOffline.current = false;
      processQueue().then((synced) => {
        if (synced > 0) {
          window.dispatchEvent(
            new CustomEvent("cantrip:sync-complete", { detail: { synced } }),
          );
        }
      });
    }
  }, [isOnline]);
}
