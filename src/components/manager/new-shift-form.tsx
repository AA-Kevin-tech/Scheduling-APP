"use client";

import { useActionState, useMemo, useState } from "react";
import { createShift } from "@/actions/shifts";
import type { Department, DepartmentZone, Role } from "@prisma/client";

type Dept = Department & {
  roles: Role[];
  zones: DepartmentZone[];
};

export function NewShiftForm({ departments }: { departments: Dept[] }) {
  const [deptId, setDeptId] = useState(departments[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(createShift, {} as { ok?: boolean; error?: string });

  const dept = useMemo(
    () => departments.find((d) => d.id === deptId),
    [departments, deptId],
  );

  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toLocalDatetimeValue(d);
  }, []);

  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    return toLocalDatetimeValue(d);
  }, []);

  if (departments.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No departments in the database. Run the seed script.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-600">Department</span>
          <select
            name="departmentId"
            required
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Role (optional)</span>
          <select
            name="roleId"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Any qualified role</option>
            {dept?.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-600">Zone (optional)</span>
          <select
            name="zoneId"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {dept?.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-600">Title (optional)</span>
          <input
            name="title"
            type="text"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Front desk"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Starts</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaultStart}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Ends</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={defaultEnd}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-600">Repeat (weeks)</span>
          <input
            name="repeatWeeks"
            type="number"
            min={1}
            max={26}
            defaultValue={1}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-slate-500">
            1 = single shift. Greater values create one copy per week with the same
            weekday and time (materialized).
          </span>
        </label>
      </div>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-700">Shift created.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Create shift"}
      </button>
    </form>
  );
}

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
