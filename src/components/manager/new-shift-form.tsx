"use client";

import { useActionState, useMemo, useState } from "react";
import { createShift } from "@/actions/shifts";
import type { Department, DepartmentZone, Role } from "@prisma/client";

type Dept = Department & {
  roles: Role[];
  zones: DepartmentZone[];
  location?: { id: string; name: string; slug: string };
};

type Props = {
  departments: Dept[];
  /** IANA zone for interpreting datetime-local fields. */
  scheduleTimeZone: string;
  defaultStartsAtLocal: string;
  defaultEndsAtLocal: string;
  initialDepartmentId?: string;
  initialRoleId?: string;
};

export function NewShiftForm({
  departments,
  scheduleTimeZone,
  defaultStartsAtLocal,
  defaultEndsAtLocal,
  initialDepartmentId,
  initialRoleId,
}: Props) {
  const [deptId, setDeptId] = useState(
    initialDepartmentId && departments.some((d) => d.id === initialDepartmentId)
      ? initialDepartmentId
      : (departments[0]?.id ?? ""),
  );
  const [state, formAction, pending] = useActionState(createShift, {} as {
    ok?: boolean;
    error?: string;
  });

  const dept = useMemo(
    () => departments.find((d) => d.id === deptId),
    [departments, deptId],
  );

  if (departments.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No departments for your venues. Ask an admin to add departments or assign
        you to a location.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="scheduleTimeZone" value={scheduleTimeZone} />
      <p className="text-xs text-slate-500">
        Times are saved in{" "}
        <span className="font-medium text-slate-700">{scheduleTimeZone}</span>.
        New shifts are saved as{" "}
        <span className="font-medium text-slate-700">drafts</span> until you
        publish them from the schedule.
      </p>
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
                {d.location ? `${d.name} (${d.location.name})` : d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Role (optional)</span>
          <select
            name="roleId"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            defaultValue={initialRoleId ?? ""}
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
            defaultValue={defaultStartsAtLocal}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Ends</span>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={defaultEndsAtLocal}
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
