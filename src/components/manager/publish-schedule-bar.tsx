"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { publishDraftShiftsForRange } from "@/actions/shifts";

type Props = {
  draftCount: number;
  weekStartIso: string;
  weekEndIso: string;
  departmentId?: string;
  roleId?: string;
  /** When false, drafts are explained but cannot be published from this UI. */
  canPublish?: boolean;
};

export function PublishScheduleBar({
  draftCount,
  weekStartIso,
  weekEndIso,
  departmentId,
  roleId,
  canPublish = true,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    publishDraftShiftsForRange,
    {} as { ok?: boolean; error?: string; count?: number },
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (draftCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-sm">
      <div>
        <p className="font-medium">
          {draftCount} draft shift{draftCount === 1 ? "" : "s"} on this screen
        </p>
        <p className="mt-0.5 text-xs text-amber-900/80">
          Staff do not see draft shifts until you publish. Matches your current
          department and role filters.
        </p>
        {!canPublish ? (
          <p className="mt-2 text-xs font-medium text-amber-900">
            Publishing is disabled — schedule is read-only for your role.
          </p>
        ) : null}
        {state.error && (
          <p className="mt-2 text-xs font-medium text-red-800" role="alert">
            {state.error}
          </p>
        )}
      </div>
      {canPublish ? (
        <form action={formAction} className="flex shrink-0 items-center gap-2">
          <input type="hidden" name="weekStart" value={weekStartIso} />
          <input type="hidden" name="weekEnd" value={weekEndIso} />
          {departmentId ? (
            <input type="hidden" name="departmentId" value={departmentId} />
          ) : null}
          {roleId ? <input type="hidden" name="roleId" value={roleId} /> : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-800 disabled:opacity-60"
          >
            {pending ? "Publishing…" : "Publish draft shifts"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
