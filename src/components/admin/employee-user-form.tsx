"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { UserRole } from "@prisma/client";
import {
  createEmployeeUser,
  updateEmployeeUser,
} from "@/actions/admin/users";
import { SCHEDULE_TIMEZONE_OPTIONS } from "@/lib/schedule/timezones";

export type DeptOption = {
  id: string;
  /** Venue this department belongs to (used to filter the list by selected locations). */
  locationId: string;
  name: string;
  roles: { id: string; name: string }[];
};

type Assignment = {
  departmentId: string;
  roleId: string | null;
  isPrimary: boolean;
};

type Props = {
  mode: "create" | "edit";
  userId?: string;
  isAdminContext: boolean;
  /** Where to send the browser after a successful create (not used for edit). */
  successRedirect?: string;
  departments: DeptOption[];
  locations: { id: string; name: string }[];
  initial?: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    employeeNumber: string | null;
    phone?: string | null;
    timezone?: string;
    locationIds: string[];
    assignments: Assignment[];
  };
};

export function EmployeeUserForm(props: Props) {
  const {
    departments,
    locations,
    mode,
    isAdminContext,
    initial,
    userId,
    successRedirect = "/admin/users",
  } = props;

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    if (initial?.assignments?.length) return initial.assignments;

    const initialLocSet =
      initial?.locationIds?.length && initial.locationIds.length > 0
        ? new Set(initial.locationIds)
        : locations[0]
          ? new Set([locations[0].id])
          : new Set<string>();

    const atSelectedVenues = departments.filter((d) =>
      initialLocSet.has(d.locationId),
    );
    const pool = atSelectedVenues.length > 0 ? atSelectedVenues : departments;
    const first = pool[0];
    return [
      {
        departmentId: first?.id ?? "",
        roleId: first?.roles[0]?.id ?? null,
        isPrimary: true,
      },
    ];
  });

  const [locIds, setLocIds] = useState<Set<string>>(() => {
    if (initial?.locationIds?.length) return new Set(initial.locationIds);
    if (locations[0]) return new Set([locations[0].id]);
    return new Set();
  });

  const action =
    mode === "create" ? createEmployeeUser : updateEmployeeUser;
  const [state, formAction, pending] = useActionState(action, null);

  const filteredDepartments = useMemo(
    () => departments.filter((d) => locIds.has(d.locationId)),
    [departments, locIds],
  );

  const deptById = useMemo(
    () => Object.fromEntries(filteredDepartments.map((d) => [d.id, d])),
    [filteredDepartments],
  );

  /** Stable order (admin list order); first selected = primary on server. */
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
    const first = filteredDepartments[0];
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
    if (state?.ok && mode === "create" && successRedirect) {
      window.location.href = successRedirect;
    }
  }, [state, mode, successRedirect]);

  useEffect(() => {
    if (filteredDepartments.length === 0) {
      setAssignments((rows) => {
        const already =
          rows.length === 1 &&
          rows[0].departmentId === "" &&
          rows[0].roleId === null;
        if (already) return rows;
        return [{ departmentId: "", roleId: null, isPrimary: true }];
      });
      return;
    }

    const allowed = new Set(filteredDepartments.map((d) => d.id));
    setAssignments((rows) => {
      let changed = false;
      const next = rows.map((row) => {
        if (allowed.has(row.departmentId)) return row;
        changed = true;
        const pick = filteredDepartments[0]!;
        return {
          departmentId: pick.id,
          roleId: pick.roles[0]?.id ?? null,
          isPrimary: row.isPrimary,
        };
      });
      if (!changed) {
        if (!rows.some((r) => r.isPrimary) && rows.length > 0) {
          return rows.map((r, i) => ({ ...r, isPrimary: i === 0 }));
        }
        return rows;
      }
      let fixed = next;
      if (!fixed.some((r) => r.isPrimary) && fixed.length > 0) {
        fixed = fixed.map((r, i) => ({ ...r, isPrimary: i === 0 }));
      }
      return fixed;
    });
  }, [filteredDepartments]);

  const assignmentsInvalid =
    filteredDepartments.length === 0 ||
    assignments.some((a) => !a.departmentId);

  if (departments.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Create at least one department before adding employees.
      </p>
    );
  }

  if (locations.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Create at least one location before adding employees.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && userId ? (
        <input type="hidden" name="userId" value={userId} />
      ) : null}

      <input
        type="hidden"
        name="assignments"
        value={JSON.stringify(assignments)}
      />

      {orderedLocationIds.map((id) => (
        <input key={id} type="hidden" name="locationIds" value={id} />
      ))}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            readOnly={mode === "edit"}
            defaultValue={initial?.email}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            First name
          </label>
          <input
            name="firstName"
            required
            autoComplete="given-name"
            defaultValue={initial?.firstName}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Last name
          </label>
          <input
            name="lastName"
            autoComplete="family-name"
            defaultValue={initial?.lastName}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>

      {mode === "create" ? (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Initial password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            At least 8 characters. They can change it after sign-in or use forgot
            password.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {isAdminContext ? (
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              name="role"
              defaultValue={initial?.role ?? "EMPLOYEE"}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="IT">IT (all sites)</option>
              <option value="PAYROLL">Payroll (all sites)</option>
            </select>
          </div>
        ) : (
          <input type="hidden" name="role" value="EMPLOYEE" />
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Employee #
          </label>
          <input
            name="employeeNumber"
            defaultValue={initial?.employeeNumber ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Phone
        </label>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          defaultValue={initial?.phone ?? ""}
          placeholder="Optional — SMS when they opt in"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Digits, spaces, dashes, +, and parentheses. Same field they can edit on their profile.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Time zone
        </label>
        <select
          name="timezone"
          defaultValue={initial?.timezone ?? "America/Chicago"}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {SCHEDULE_TIMEZONE_OPTIONS.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Used for their schedule and calendar display.
        </p>
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
            disabled={filteredDepartments.length === 0}
            className="text-sm text-sky-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
          >
            Add department
          </button>
        </div>
        {departments.length > 0 && filteredDepartments.length === 0 ? (
          <p className="mt-2 text-sm text-amber-800">
            None of the selected venues have departments yet. Select another
            venue or add departments under Admin → Departments for that venue.
          </p>
        ) : null}
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
                      {filteredDepartments.length === 0 ? (
                        <option value="">
                          No departments for selected venues
                        </option>
                      ) : (
                        <>
                          {!row.departmentId ? (
                            <option value="">— Select department —</option>
                          ) : null}
                          {filteredDepartments.map((dep) => (
                            <option key={dep.id} value={dep.id}>
                              {dep.name}
                            </option>
                          ))}
                        </>
                      )}
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
        <p className="text-sm text-emerald-700">
          {mode === "create" ? "Saved. Redirecting…" : "Saved."}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || assignmentsInvalid}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : mode === "create" ? "Create user" : "Save"}
      </button>
    </form>
  );
}
