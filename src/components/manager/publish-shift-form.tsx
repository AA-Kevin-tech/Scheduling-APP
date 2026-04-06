"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { publishShift } from "@/actions/shifts";

export function PublishShiftForm({ shiftId }: { shiftId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    publishShift,
    {} as { ok?: boolean; error?: string },
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={shiftId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish shift"}
      </button>
      {state.error && (
        <span className="text-sm text-red-700" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
