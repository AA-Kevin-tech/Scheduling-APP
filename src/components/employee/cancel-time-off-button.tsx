"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelTimeOffRequest } from "@/actions/time-off";

export function CancelTimeOffButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set("id", id);
          await cancelTimeOffRequest(fd);
          router.refresh();
        });
      }}
      className="shrink-0 text-xs text-slate-700 underline hover:text-slate-900 disabled:opacity-50"
    >
      {pending ? "…" : "Cancel"}
    </button>
  );
}
