import Link from "next/link";
import {
  listRoleSchedulingEditState,
  updateRoleSchedulingEditPermission,
} from "@/actions/admin/role-permissions";
import { requireSuperAdmin } from "@/lib/auth/guards";
import type { UserRole } from "@prisma/client";

function roleLabel(role: UserRole): string {
  switch (role) {
    case "EMPLOYEE":
      return "Employee";
    case "MANAGER":
      return "Manager";
    case "ADMIN":
      return "Admin";
    case "IT":
      return "IT";
    case "PAYROLL":
      return "Payroll";
    default:
      return role;
  }
}

export default async function RolePermissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string | string[] }>;
}) {
  await requireSuperAdmin();
  const rows = await listRoleSchedulingEditState();
  const sp = searchParams ? await searchParams : {};
  const err = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
          Role permissions
        </h1>
        <Link href="/admin" className="text-sm text-sky-700 hover:underline">
          ← Admin
        </Link>
      </div>

      {err === "invalid" ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          Could not update permission. Try again.
        </p>
      ) : null}

      <p className="text-sm text-slate-600 dark:text-zinc-400">
        Super Admins can turn capabilities on or off per login role. When{" "}
        <span className="font-medium">Edit schedule</span> is off, that role
        can still open the week grid but only in read-only mode (no new shifts,
        edits, publishing, bulk tools, or day notes). Super Admin accounts
        always have full schedule access.
      </p>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-zinc-700 dark:bg-zinc-900/40">
              <th className="px-4 py-3 font-semibold text-slate-800 dark:text-zinc-200">
                Role
              </th>
              <th className="px-4 py-3 font-semibold text-slate-800 dark:text-zinc-200">
                Edit schedule
              </th>
              <th className="px-4 py-3 font-semibold text-slate-800 dark:text-zinc-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.role}
                className="border-b border-slate-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-zinc-100">
                  {roleLabel(r.role)}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-zinc-300">
                  {r.allowed ? (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      On
                    </span>
                  ) : (
                    <span className="text-amber-800 dark:text-amber-300">
                      Read-only
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <form action={updateRoleSchedulingEditPermission}>
                    <input type="hidden" name="role" value={r.role} />
                    <input
                      type="hidden"
                      name="allowed"
                      value={r.allowed ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {r.allowed ? "Set read-only" : "Allow editing"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
