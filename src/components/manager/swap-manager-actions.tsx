"use client";

import { useActionState } from "react";
import { approveSwapAsManager, denySwapAsManager } from "@/actions/swaps";

export function SwapManagerActions({ swapId }: { swapId: string }) {
  const [state, approveAction, pending] = useActionState(approveSwapAsManager, {});

  return (
    <div className="space-y-2">
      <form action={approveAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={swapId} />
        <input
          name="managerOverrideReason"
          placeholder="Override reason if rules block approval"
          className="min-h-10 flex-1 rounded-md border border-slate-300 px-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 rounded-md bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "…" : "Approve"}
        </button>
      </form>
      {state.error && (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <form action={denySwapAsManager} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={swapId} />
        <input
          name="managerNote"
          placeholder="Note to employees (optional)"
          className="min-h-10 flex-1 rounded-md border border-slate-300 px-2 text-sm"
        />
        <button
          type="submit"
          className="min-h-10 rounded-md border border-red-200 bg-red-50 px-3 text-sm text-red-900 hover:bg-red-100"
        >
          Deny
        </button>
      </form>
    </div>
  );
}
