"use client";

import { useActionState } from "react";
import { acceptSwapAsTarget, rejectSwapAsTarget } from "@/actions/swaps";

export function SwapIncomingActions({ swapId }: { swapId: string }) {
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptSwapAsTarget,
    {},
  );

  return (
    <div className="flex flex-wrap gap-2">
      <form action={acceptAction}>
        <input type="hidden" name="id" value={swapId} />
        <button
          type="submit"
          disabled={acceptPending}
          className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {acceptPending ? "…" : "Accept"}
        </button>
      </form>
      {acceptState.error && (
        <p className="w-full text-xs text-red-600">{acceptState.error}</p>
      )}
      <form action={rejectSwapAsTarget}>
        <input type="hidden" name="id" value={swapId} />
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 dark:text-zinc-200 hover:bg-slate-50"
        >
          Decline
        </button>
      </form>
    </div>
  );
}
