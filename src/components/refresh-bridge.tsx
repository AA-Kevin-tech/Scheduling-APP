"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Soft refresh for schedule / swap changes (Phase 5). Polling avoids Railway WebSocket limits. */
export function RefreshBridge({ intervalMs = 45000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);

  return null;
}
