"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import type {
  CoverageRule,
  Department,
  DepartmentZone,
  Role,
} from "@prisma/client";
import {
  createCoverageRule,
  deleteCoverageRule,
  updateCoverageRule,
} from "@/actions/admin/coverage-rules";
import {
  createDepartmentZone,
  deleteDepartment,
  deleteDepartmentZone,
  updateDepartment,
} from "@/actions/admin/departments";
import { DeleteResourceForm } from "@/components/admin/delete-resource-form";

const COLORS = [
  "emerald",
  "amber",
  "violet",
  "teal",
  "rose",
  "slate",
  "sky",
] as const;

type Dept = Department & {
  roles: Role[];
  zones: DepartmentZone[];
  coverageRules: CoverageRule[];
  location: { id: string; name: string; slug: string };
};

export function DepartmentEditForm({ d }: { d: Dept }) {
  const [state, formAction, pending] = useActionState(updateDepartment, null);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs text-slate-500">
        Venue:{" "}
        <span className="font-medium text-slate-700">{d.location.name}</span>
      </p>
      <form
        action={formAction}
        className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
      >
        <input type="hidden" name="id" value={d.id} />
        <div className="min-w-[10rem] flex-1">
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input
            name="name"
            defaultValue={d.name}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-36">
          <label className="text-xs font-medium text-slate-600">Color</label>
          <select
            name="colorToken"
            defaultValue={d.colorToken}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="text-xs font-medium text-slate-600">Order</label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={d.sortOrder}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
      </form>
      {state?.error ? (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-medium uppercase text-slate-500">Roles</h3>
          <ul className="mt-1 text-sm text-slate-700">
            {d.roles.map((r) => (
              <li key={r.id}>
                {r.name} <span className="text-slate-400">({r.slug})</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-medium uppercase text-slate-500">Zones</h3>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {d.zones.length === 0 ? (
              <li className="text-slate-400">None yet</li>
            ) : (
              d.zones.map((z) => (
                <li
                  key={z.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    {z.name}{" "}
                    <span className="text-slate-400">({z.slug})</span>
                  </span>
                  <DeleteResourceForm
                    action={deleteDepartmentZone}
                    id={z.id}
                    label="Remove"
                  />
                </li>
              ))
            )}
          </ul>
          <AddDepartmentZoneForm departmentId={d.id} />
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <h3 className="text-xs font-medium uppercase text-slate-500">
          Coverage minimums
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Used on the manager coverage report. Department-wide rules count everyone
          scheduled in this department that day. Zone rules count only shifts tagged
          with that zone. If several rules apply, the report uses the tightest
          shortfall.
        </p>
        <ul className="mt-3 space-y-4">
          {d.coverageRules.map((rule) => (
            <CoverageRuleEditRow
              key={rule.id}
              rule={rule}
              departmentId={d.id}
              zones={d.zones}
            />
          ))}
        </ul>
        <AddCoverageRuleForm departmentId={d.id} zones={d.zones} />
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <DeleteResourceForm
          action={deleteDepartment}
          id={d.id}
          label="Delete department"
        />
      </div>
    </li>
  );
}

function AddDepartmentZoneForm({ departmentId }: { departmentId: string }) {
  const [state, formAction, pending] = useActionState(
    createDepartmentZone,
    null as { ok?: boolean; error?: string } | null,
  );

  return (
    <form
      action={formAction}
      className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <input type="hidden" name="departmentId" value={departmentId} />
      <label className="min-w-[12rem] flex-1 text-xs font-medium text-slate-600">
        <span className="block">Add zone</span>
        <input
          name="name"
          required
          placeholder="e.g. Stingray touch"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal"
          autoComplete="off"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "…" : "Add zone"}
      </button>
      {state?.error ? (
        <p className="w-full text-xs text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}

function CoverageRuleEditRow({
  rule,
  departmentId,
  zones,
}: {
  rule: CoverageRule;
  departmentId: string;
  zones: DepartmentZone[];
}) {
  const [state, formAction, pending] = useActionState(
    updateCoverageRule,
    null as { ok?: boolean; error?: string } | null,
  );
  /** Keep delete in a separate form — nested <form> is invalid HTML and breaks the rest of the page (e.g. "Delete draft"). */
  const formId = `edit-coverage-rule-${rule.id}`;

  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <form id={formId} action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={rule.id} />
        <input type="hidden" name="departmentId" value={departmentId} />
        <div className="grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Min staff</span>
            <input
              name="minStaffCount"
              type="number"
              min={1}
              max={999}
              required
              defaultValue={rule.minStaffCount}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tabular-nums shadow-sm"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Zone (optional)</span>
            <select
              name="zoneId"
              defaultValue={rule.zoneId ?? ""}
              className="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
            >
              <option value="">Whole department</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>Note (optional)</span>
            <input
              name="note"
              type="text"
              defaultValue={rule.note ?? ""}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
              placeholder="e.g. Weekend minimum"
            />
          </label>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          form={formId}
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? "…" : "Save rule"}
        </button>
        <DeleteResourceForm
          action={deleteCoverageRule}
          id={rule.id}
          label="Delete rule"
        />
      </div>
      {state?.error ? (
        <p className="mt-2 text-xs text-red-600">{state.error}</p>
      ) : null}
    </li>
  );
}

function AddCoverageRuleForm({
  departmentId,
  zones,
}: {
  departmentId: string;
  zones: DepartmentZone[];
}) {
  const router = useRouter();
  /** Remount inner UI so fields and action state reset (native form.reset() is unreliable with React). */
  const [instanceKey, setInstanceKey] = useState(0);
  return (
    <AddCoverageRuleFormInner
      key={instanceKey}
      departmentId={departmentId}
      zones={zones}
      onDeleteDraft={() => {
        setInstanceKey((k) => k + 1);
        router.refresh();
      }}
    />
  );
}

function AddCoverageRuleFormInner({
  departmentId,
  zones,
  onDeleteDraft,
}: {
  departmentId: string;
  zones: DepartmentZone[];
  onDeleteDraft: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createCoverageRule,
    null as { ok?: boolean; error?: string } | null,
  );
  /** Must be unique per department card; also keeps "Delete draft" outside the form (Next form actions + labels can swallow inner button clicks). */
  const formId = `add-coverage-rule-${departmentId}`;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
      <form id={formId} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="departmentId" value={departmentId} />
        <p className="text-xs font-medium text-slate-600">Add coverage rule</p>
        <div className="grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Min staff</span>
            <input
              name="minStaffCount"
              type="number"
              min={1}
              max={999}
              defaultValue={1}
              required
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tabular-nums shadow-sm"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
            <span>Zone (optional)</span>
            <select
              name="zoneId"
              className="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
            >
              <option value="">Whole department</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>Note (optional)</span>
            <input
              name="note"
              type="text"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
            />
          </label>
        </div>
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <button
          form={formId}
          type="submit"
          disabled={pending}
          className="inline-flex h-9 w-fit items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? "…" : "Add rule"}
        </button>
        <button
          type="button"
          className="text-sm text-red-600 hover:underline"
          onClick={() => onDeleteDraft()}
        >
          Delete draft
        </button>
      </div>
      {state?.error ? (
        <p className="text-xs text-red-600">{state.error}</p>
      ) : null}
    </div>
  );
}
