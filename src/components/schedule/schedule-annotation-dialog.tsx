"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  deleteScheduleAnnotation,
  saveScheduleAnnotation,
} from "@/actions/manager/schedule-annotations";
import type { ScheduleAnnotationDTO } from "@/lib/schedule/annotations";
import { ANNOTATION_HIGHLIGHT_OPTIONS } from "@/lib/schedule/annotations";

type Props = {
  dayIso: string;
  onClose: () => void;
  annotations: ScheduleAnnotationDTO[];
  locations: { id: string; name: string }[];
  defaultLocationId: string | null;
  editing: ScheduleAnnotationDTO | null;
  onStartEdit: (row: ScheduleAnnotationDTO) => void;
  onClearEditing: () => void;
};

function annotationsForDay(iso: string, list: ScheduleAnnotationDTO[]) {
  return list.filter((a) => iso >= a.startsOnYmd && iso <= a.endsOnYmd);
}

export function ScheduleAnnotationDialog({
  dayIso,
  onClose,
  annotations,
  locations,
  defaultLocationId,
  editing,
  onStartEdit,
  onClearEditing,
}: Props) {
  const router = useRouter();
  const [saveState, saveAction, savePending] = useActionState(
    saveScheduleAnnotation,
    null as { ok?: boolean; error?: string } | null,
  );
  const [delState, delAction, delPending] = useActionState(
    deleteScheduleAnnotation,
    null as { ok?: boolean; error?: string } | null,
  );

  useEffect(() => {
    if (saveState?.ok || delState?.ok) {
      router.refresh();
      onClearEditing();
    }
  }, [saveState?.ok, delState?.ok, router, onClearEditing]);

  const forDay = annotationsForDay(dayIso, annotations);
  const busy = savePending || delPending;
  const locDefault =
    editing?.locationId ??
    defaultLocationId ??
    locations[0]?.id ??
    "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="annotation-dialog-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto surface-card p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2
            id="annotation-dialog-title"
            className="text-lg font-semibold text-slate-900"
          >
            {editing ? "Edit day note" : "Add day note"} · {dayIso}
          </h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Optional announcement for the schedule, mark the site closed, and/or
          block new time off requests for employees at that venue.
        </p>

        {forDay.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            <li className="text-xs font-medium uppercase tracking-wide text-slate-500">
              This day
            </li>
            {forDay.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{row.title}</p>
                  <p className="text-xs text-slate-500">{row.locationName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {row.startsOnYmd === row.endsOnYmd
                      ? row.startsOnYmd
                      : `${row.startsOnYmd} → ${row.endsOnYmd}`}
                    {" · "}
                    {[
                      row.showAnnouncement ? "Announcement" : null,
                      row.businessClosed ? "Closed" : null,
                      row.blockTimeOffRequests ? "No time off" : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {row.message ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                      {row.message}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => onStartEdit(row)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          key={editing?.id ?? `new-${dayIso}`}
          action={saveAction}
          className="mt-4 space-y-3 border-t border-slate-100 pt-4"
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              <span className="block">Venue</span>
              <select
                name="locationId"
                required
                defaultValue={locDefault}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="block">Highlight</span>
              <select
                name="highlightHex"
                defaultValue={editing?.highlightHex ?? ""}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {ANNOTATION_HIGHLIGHT_OPTIONS.map((o) => (
                  <option key={o.value || "default"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="block">Start date</span>
              <input
                name="startsOnYmd"
                type="date"
                required
                defaultValue={editing?.startsOnYmd ?? dayIso}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              <span className="block">End date</span>
              <input
                name="endsOnYmd"
                type="date"
                required
                defaultValue={editing?.endsOnYmd ?? dayIso}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-slate-600">
            <span className="block">Title</span>
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={editing?.title ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="e.g. Inventory morning"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            <span className="block">Message (optional)</span>
            <textarea
              name="message"
              rows={3}
              defaultValue={editing?.message ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-medium text-slate-600">
              Types (one or more)
            </legend>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                name="showAnnouncement"
                defaultChecked={editing?.showAnnouncement ?? true}
              />
              Announcement (visible on schedule & home)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                name="businessClosed"
                defaultChecked={editing?.businessClosed ?? false}
              />
              Business closed (shown on schedule)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                name="blockTimeOffRequests"
                defaultChecked={editing?.blockTimeOffRequests ?? false}
              />
              Do not allow time off requests
            </label>
          </fieldset>
          {saveState?.error ? (
            <p className="text-sm text-red-600">{saveState.error}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || locations.length === 0}
              className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {savePending ? "Saving…" : editing ? "Save changes" : "Add note"}
            </button>
            {editing ? (
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={onClearEditing}
              >
                New note instead
              </button>
            ) : null}
          </div>
        </form>

        {forDay.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500">Delete a note</p>
            <ul className="mt-2 space-y-2">
              {forDay.map((row) => (
                <li key={`del-${row.id}`}>
                  <form action={delAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                      {row.title}
                    </span>
                    <button
                      type="submit"
                      disabled={busy}
                      className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                    >
                      {delPending ? "…" : "Delete"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            {delState?.error ? (
              <p className="mt-2 text-sm text-red-600">{delState.error}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
