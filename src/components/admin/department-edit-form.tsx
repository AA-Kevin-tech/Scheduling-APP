"use client";

import { useActionState } from "react";
import type { Department, DepartmentZone, Role } from "@prisma/client";
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
};

export function DepartmentEditForm({ d }: { d: Dept }) {
  const [state, formAction, pending] = useActionState(updateDepartment, null);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
        <DeleteResourceForm action={deleteDepartment} id={d.id} />
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
