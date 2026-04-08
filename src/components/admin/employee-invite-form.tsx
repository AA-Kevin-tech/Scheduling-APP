"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createEmployeeInvite } from "@/actions/employee-invite";
import type { DeptOption } from "@/components/admin/employee-user-form";

type Assignment = {
  departmentId: string;
  roleId: string | null;
  isPrimary: boolean;
};

type Props = {
  departments: DeptOption[];
  locations: { id: string; name: string }[];
  successRedirect?: string;
};

export function EmployeeInviteForm(props: Props) {
  const { departments, locations, successRedirect = "/manager/employees" } =
    props;

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const first = departments[0];
    return [
      {
        departmentId: first?.id ?? "",
        roleId: first?.roles[0]?.id ?? null,
        isPrimary: true,
      },
    ];
  });

  const [locIds, setLocIds] = useState<Set<string>>(() => {
    if (locations[0]) return new Set([locations[0].id]);
    return new Set();
  });

  const [state, formAction, pending] = useActionState(createEmployeeInvite, null);

  const deptById = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d])),
    [departments],
  );

  const orderedLocationIds = useMemo(
    () => locations.filter((l) => locIds.has(l.id)).map((l) => l.id),
    [locations, locIds],
  );

  function setPrimary(index: number) {
    setAssignments((rows) =>
      rows.map((r, i) => ({ ...r, isPrimary: i === index })),
    );
  }

  function addRow() {
    const first = departments[0];
    setAssignments((rows) => [
      ...rows,
      {
        departmentId: first?.id ?? "",
        roleId: first?.roles[0]?.id ?? null,
        isPrimary: rows.length === 0,
      },
    ]);
  }

  function removeRow(index: number) {
    setAssignments((rows) => {
      const next = rows.filter((_, i) => i !== index);
      if (!next.some((r) => r.isPrimary) && next.length > 0) {
        next[0].isPrimary = true;
      }
      return [...next];
    });
  }

  function patchRow(index: number, patch: Partial<Assignment>) {
    setAssignments((rows) => {
      const next = [...rows];
      const cur = { ...next[index], ...patch };
      if (patch.departmentId !== undefined) {
        const d = deptById[patch.departmentId];
        cur.roleId = d?.roles[0]?.id ?? null;
      }
      next[index] = cur;
      return next;
    });
  }

  function toggleLocation(id: string) {
    setLocIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        if (n.size <= 1) return n;
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }

  useEffect(() => {
    if (state?.ok && successRedirect) {
      window.location.href = successRedirect;
    }
  }, [state, successRedirect]);

  if (departments.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Create at least one department before inviting employees.
      </p>
    );
  }

  if (locations.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Create at least one location before inviting employees.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="assignments"
        value={JSON.stringify(assignments)}
      />

      {orderedLocationIds.map((id) => (
        <input key={id} type="hidden" name="locationIds" value={id} />
      ))}

      <p className="text-sm text-slate-600">
        We will email a secure link. They choose a password, set a time clock
        PIN, and enter payroll information (encrypted) for future QuickBooks
        export.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Employee #
          </label>
          <input
            name="employeeNumber"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-800">Locations</h3>
        <ul className="mt-2 space-y-2">
          {locations.map((loc) => (
            <li key={loc.id}>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={locIds.has(loc.id)}
                  onChange={() => toggleLocation(loc.id)}
                />
                {loc.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-slate-800">Departments</h3>
          <button
            type="button"
            onClick={addRow}
            className="text-sm text-sky-700 hover:underline"
          >
            Add department
          </button>
        </div>
        <ul className="mt-3 space-y-3">
          {assignments.map((row, index) => {
            const d = deptById[row.departmentId];
            const roles = d?.roles ?? [];
            return (
              <li
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50/80 p-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      Department
                    </label>
                    <select
                      value={row.departmentId}
                      onChange={(e) =>
                        patchRow(index, { departmentId: e.target.value })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      Role
                    </label>
                    <select
                      value={row.roleId ?? ""}
                      onChange={(e) =>
                        patchRow(index, {
                          roleId: e.target.value || null,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">—</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="radio"
                      name="primaryDept"
                      checked={row.isPrimary}
                      onChange={() => setPrimary(index)}
                    />
                    Primary department
                  </label>
                  {assignments.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-700">Invite sent. Redirecting…</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send invite email"}
      </button>
    </form>
  );
}
