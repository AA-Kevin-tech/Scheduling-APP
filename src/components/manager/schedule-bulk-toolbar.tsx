"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  runScheduleBulkAction,
  type ScheduleBulkState,
} from "@/actions/schedule-bulk";
import {
  PASTE_MODE_LABELS,
  type SchedulePasteMode,
} from "@/lib/schedule/paste-modes";

type TemplateOption = { id: string; name: string };

type Props = {
  mondayIso: string;
  departmentId?: string;
  roleId?: string;
  templates: TemplateOption[];
};

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto surface-card p-5 shadow-lg"
        role="dialog"
        aria-labelledby="schedule-bulk-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2
            id="schedule-bulk-modal-title"
            className="text-base font-semibold text-slate-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ScheduleBulkToolbar({
  mondayIso,
  departmentId,
  roleId,
  templates,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    runScheduleBulkAction,
    {} as ScheduleBulkState,
  );
  const [panel, setPanel] = useState<
    null | "copy" | "save" | "load" | "delete" | "update"
  >(null);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      setPanel(null);
    }
  }, [state.ok, router]);

  const hiddenFilters = (
    <>
      <input type="hidden" name="mondayIso" value={mondayIso} />
      {departmentId ? (
        <input type="hidden" name="departmentId" value={departmentId} />
      ) : null}
      {roleId ? <input type="hidden" name="roleId" value={roleId} /> : null}
    </>
  );

  const modeOptions = (Object.keys(PASTE_MODE_LABELS) as SchedulePasteMode[]).map(
    (m) => (
      <option key={m} value={m}>
        {PASTE_MODE_LABELS[m]}
      </option>
    ),
  );

  const templateSelectRequired = (
    <select
      name="templateId"
      required
      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      defaultValue=""
    >
      <option value="" disabled>
        Select template…
      </option>
      {templates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">
          Schedule shortcuts
        </span>
        <button
          type="button"
          onClick={() => setPanel("copy")}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Copy previous week
        </button>
        <button
          type="button"
          onClick={() => setPanel("save")}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Save as template
        </button>
        <button
          type="button"
          onClick={() => setPanel("load")}
          disabled={templates.length === 0}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load template
        </button>
        <button
          type="button"
          onClick={() => setPanel("update")}
          disabled={templates.length === 0}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Update template
        </button>
        <button
          type="button"
          onClick={() => setPanel("delete")}
          disabled={templates.length === 0}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete template
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Copy and templates use your current department and role filters. New
        shifts are drafts until published.
      </p>
      {state.error ? (
        <p className="mt-2 text-sm font-medium text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="mt-2 text-sm text-emerald-800">{state.message}</p>
      ) : null}

      {panel === "copy" ? (
        <Modal title="Copy previous week" onClose={() => setPanel(null)}>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="intent" value="copy_previous_week" />
            {hiddenFilters}
            <label className="block text-sm">
              <span className="text-slate-600">When shifts conflict</span>
              <select
                name="mode"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                defaultValue="AVOID_CONFLICTS"
              >
                {modeOptions}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
            >
              {pending ? "Working…" : "Copy into this week"}
            </button>
          </form>
        </Modal>
      ) : null}

      {panel === "save" ? (
        <Modal title="Save as template" onClose={() => setPanel(null)}>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="intent" value="save_template" />
            {hiddenFilters}
            <label className="block text-sm">
              <span className="text-slate-600">Name</span>
              <input
                name="name"
                required
                maxLength={120}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. Standard week — Front desk"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Description (optional)</span>
              <textarea
                name="description"
                rows={2}
                maxLength={2000}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="includeRepeating" className="rounded" />
              Include repeating / series shifts
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save template"}
            </button>
          </form>
        </Modal>
      ) : null}

      {panel === "load" ? (
        <Modal title="Load template" onClose={() => setPanel(null)}>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="intent" value="load_template" />
            {hiddenFilters}
            <label className="block text-sm">
              <span className="text-slate-600">Template</span>
              {templateSelectRequired}
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">When shifts conflict</span>
              <select
                name="mode"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                defaultValue="AVOID_CONFLICTS"
              >
                {modeOptions}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
            >
              {pending ? "Loading…" : "Load into this week"}
            </button>
          </form>
        </Modal>
      ) : null}

      {panel === "delete" ? (
        <Modal title="Delete template" onClose={() => setPanel(null)}>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="intent" value="delete_template" />
            <label className="block text-sm">
              <span className="text-slate-600">Template</span>
              {templateSelectRequired}
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
          </form>
        </Modal>
      ) : null}

      {panel === "update" ? (
        <Modal title="Update template from this week" onClose={() => setPanel(null)}>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="intent" value="update_template" />
            {hiddenFilters}
            <label className="block text-sm">
              <span className="text-slate-600">Template to replace</span>
              {templateSelectRequired}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="includeRepeating" className="rounded" />
              Include repeating / series shifts
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
            >
              {pending ? "Updating…" : "Overwrite template"}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
