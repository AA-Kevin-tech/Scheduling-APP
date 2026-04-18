"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createEmployeeInvite } from "@/actions/employee-invite";
import type { DeptOption } from "@/components/admin/employee-user-form";
import { ONBOARDING_DOCUMENT_ROWS } from "@/lib/onboarding/document-catalog";

type EmailTemplateOption = { id: string; name: string };

type Assignment = {
  departmentId: string;
  roleId: string | null;
  isPrimary: boolean;
};

type Props = {
  departments: DeptOption[];
  locations: { id: string; name: string }[];
  emailTemplates?: EmailTemplateOption[];
  /** When set, show a link for admins to edit templates. */
  manageTemplatesHref?: string;
  successRedirect?: string;
};

export function EmployeeInviteForm(props: Props) {
  const {
    departments,
    locations,
    emailTemplates = [],
    manageTemplatesHref,
    successRedirect = "/manager/employees",
  } = props;

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const initialLocSet = locations[0] ? new Set([locations[0].id]) : new Set<string>();
    const atVenue = departments.filter((d) => initialLocSet.has(d.locationId));
    const pool = atVenue.length > 0 ? atVenue : departments;
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
    if (locations[0]) return new Set([locations[0].id]);
    return new Set();
  });

  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(() => new Set());

  const [state, formAction, pending] = useActionState(createEmployeeInvite, null);

  const filteredDepartments = useMemo(
    () => departments.filter((d) => locIds.has(d.locationId)),
    [departments, locIds],
  );

  const deptById = useMemo(
    () => Object.fromEntries(filteredDepartments.map((d) => [d.id, d])),
    [filteredDepartments],
  );

  const orderedLocationIds = useMemo(
    () => locations.filter((l) => locIds.has(l.id)).map((l) => l.id),
    [locations, locIds],
  );

  const onboardingDocSelectionsJson = useMemo(
    () => JSON.stringify({ selectedIds: [...selectedDocIds] }),
    [selectedDocIds],
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

  function toggleDocRow(id: string) {
    setSelectedDocIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  useEffect(() => {
    if (state?.ok && successRedirect) {
      window.location.href = successRedirect;
    }
  }, [state, successRedirect]);

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
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
      <input
        type="hidden"
        name="assignments"
        value={JSON.stringify(assignments)}
      />
      <input type="hidden" name="onboardingDocSelections" value={onboardingDocSelectionsJson} />

      {orderedLocationIds.map((id) => (
        <input key={id} type="hidden" name="locationIds" value={id} />
      ))}

      <p className="text-sm text-slate-600 dark:text-zinc-400">
        We will email a secure link. They choose a password, set a time clock
        PIN, and enter payroll information (encrypted) for future QuickBooks
        export. You may attach PDFs (for example the current IRS W-4) and other
        documents below.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
            First name
          </label>
          <input
            name="firstName"
            required
            autoComplete="given-name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
            Last name
          </label>
          <input
            name="lastName"
            autoComplete="family-name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">
            Employee #
          </label>
          <input
            name="employeeNumber"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
          Invite email
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
          Templates support placeholders:{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-800">
            {"{{onboardingUrl}}"}
          </code>
          ,{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-800">
            {"{{employeeFirstName}}"}
          </code>
          ,{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-800">
            {"{{employeeLastName}}"}
          </code>
          ,{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-800">
            {"{{complianceLinksHtml}}"}
          </code>{" "}
          (official reference links for selected Texas / federal rows). In the
          subject line,{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-800">
            {"{{complianceLinksHtml}}"}
          </code>{" "}
          is omitted.
        </p>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400">
            Template
          </label>
          <select
            name="emailTemplateId"
            className="mt-1 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            defaultValue=""
          >
            <option value="">Default (built-in)</option>
            {emailTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {manageTemplatesHref ? (
            <p className="mt-2 text-xs">
              <Link
                href={manageTemplatesHref}
                className="text-sky-700 hover:underline"
              >
                Create or edit templates
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-zinc-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
          Forms & Texas / federal compliance package
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
          Check a row to include it in the email: official PDFs are downloaded
          from the government site when available, and reference links are added
          to the message. Use the file column to attach your own copy instead
          (for example a signed PDF from HR).
        </p>
        <ul className="mt-4 space-y-4">
          {ONBOARDING_DOCUMENT_ROWS.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800 sm:flex-row sm:items-start"
            >
              <label className="flex shrink-0 cursor-pointer items-start gap-2 sm:w-[44%]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedDocIds.has(row.id)}
                  onChange={() => toggleDocRow(row.id)}
                />
                <span>
                  <span className="text-sm font-medium text-slate-800 dark:text-zinc-200">
                    {row.label}
                  </span>
                  {row.fetchPdf ? (
                    <span className="ml-1 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                      (official PDF when selected)
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-zinc-500">
                    {row.help}
                  </span>
                </span>
              </label>
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                  Optional file (PDF, Word, or image)
                </label>
                <input
                  type="file"
                  name={`docFile_${row.id}`}
                  accept=".pdf,.doc,.docx,image/png,image/jpeg,.png,.jpg,.jpeg"
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-zinc-400 dark:file:border-zinc-600 dark:file:bg-zinc-800"
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-zinc-800">
          <label className="text-sm font-medium text-slate-800 dark:text-zinc-200">
            Extra attachments
          </label>
          <p className="text-xs text-slate-500 dark:text-zinc-500">
            Employee handbook acknowledgment, offer letter, or other PDFs (up to
            eight files, 5 MB each).
          </p>
          <input
            type="file"
            name="extraAttachments"
            multiple
            accept=".pdf,.doc,.docx,image/png,image/jpeg,.png,.jpg,.jpeg"
            className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-zinc-400 dark:file:border-zinc-600 dark:file:bg-zinc-800"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Locations</h3>
        <ul className="mt-2 space-y-2">
          {locations.map((loc) => (
            <li key={loc.id}>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
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
          <h3 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Departments</h3>
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
            venue or add departments for that venue first.
          </p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {assignments.map((row, index) => {
            const d = deptById[row.departmentId];
            const roles = d?.roles ?? [];
            return (
              <li
                key={index}
                className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/30"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                      Department
                    </label>
                    <select
                      value={row.departmentId}
                      onChange={(e) =>
                        patchRow(index, { departmentId: e.target.value })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
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
                    <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                      Role
                    </label>
                    <select
                      value={row.roleId ?? ""}
                      onChange={(e) =>
                        patchRow(index, {
                          roleId: e.target.value || null,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
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
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
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
        disabled={pending || assignmentsInvalid}
        className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send invite email"}
      </button>
    </form>
  );
}
