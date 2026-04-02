"use client";

import { useActionState, useMemo, useState } from "react";
import { updateShift } from "@/actions/shifts";
import type { Department, DepartmentZone, Role } from "@prisma/client";

type ShiftFields = Pick<
  import("@prisma/client").Shift,
  "id" | "departmentId" | "roleId" | "zoneId" | "title" | "startsAt" | "endsAt"
>;

type Dept = Department & {
  roles: Role[];
  zones: DepartmentZone[];
};

export function EditShiftForm({
  shift,
  departments,
}: {
  shift: ShiftFields;
  departments: Dept[];
}) {
  const [deptId, setDeptId] = useState(shift.departmentId);
  const [state, formAction, pending] = useActionState(updateShift, {} as {
    ok?: boolean;
    error?: string;
  });

  const dept = useMemo(
    () => departments.find((d) => d.id === deptId),
    [departments, deptId],
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={shift.id} />
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
            defaultValue={shift.roleId ?? ""}
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
            defaultValue={shift.zoneId ?? ""}
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
            defaultValue={shift.title ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Starts</span>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toLocalDatetimeValue(new Date(shift.startsAt))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Ends</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={toLocalDatetimeValue(new Date(shift.endsAt))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-700">Shift updated.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
