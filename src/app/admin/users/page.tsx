import Link from "next/link";
import { auth } from "@/auth";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireAdmin } from "@/lib/auth/guards";
import { getUsersForAdminList } from "@/lib/queries/admin";

export default async function AdminUsersPage() {
  await requireAdmin();
  const session = await auth();
  const venueScope =
    session != null ? await getSchedulingLocationIdsForSession(session) : null;
  const scoped =
    venueScope != null && venueScope.length > 0 ? venueScope : null;

  const users = await getUsersForAdminList({
    onlyAtLocations: scoped ?? undefined,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Users</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/users/new"
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Add employee
          </Link>
          <Link
            href="/admin/users/invite"
            className="rounded-md border border-sky-700 bg-white px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50"
          >
            Invite by email
          </Link>
          <Link
            href="/admin/employee-onboarding"
            className="rounded-md border border-sky-700 bg-white px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50"
          >
            Onboarding tracker
          </Link>
        </div>
      </div>

      {scoped ? (
        <p className="text-sm text-slate-600 dark:text-zinc-400">
          Listing users who work at the venue(s) selected above (and accounts
          without an employee profile). Choose <span className="font-medium">All venues</span>{" "}
          for the full directory.
        </p>
      ) : null}

      <p className="text-sm text-slate-600 dark:text-zinc-400">
        <span className="font-medium text-slate-800 dark:text-zinc-200">Add employee</span> creates
        the account now for someone who already works with you—you set their
        password (or share it once) and their locations and departments.{" "}
        <span className="font-medium text-slate-800 dark:text-zinc-200">Invite by email</span> sends
        a link so they finish signup and payroll details themselves.
      </p>

      <div className="overflow-x-auto surface-card">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head-row">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Locations</th>
              <th className="px-3 py-2">Departments</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-zinc-100">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {u.name ?? "—"}
                    {u.employee?.archivedAt != null && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-zinc-300">
                        Archived
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">{u.email}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-zinc-300">{u.role}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">
                  {u.employee?.locations.length ? (
                    <ul className="max-w-[10rem]">
                      {u.employee.locations.map((el) => (
                        <li key={el.id}>{el.location.name}</li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">
                  {u.employee?.departments.length ? (
                    <ul className="max-w-[12rem]">
                      {u.employee.departments.map((ed) => (
                        <li key={ed.id}>
                          {ed.department.name}
                          {ed.role ? ` · ${ed.role.name}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  {u.employee ? (
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sky-700 hover:underline"
                    >
                      Edit
                    </Link>
                  ) : (
                    <span className="text-slate-400">No profile</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
