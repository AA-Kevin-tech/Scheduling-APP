import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { getUsersForAdminList } from "@/lib/queries/admin";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await getUsersForAdminList();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <Link
          href="/admin/users/new"
          className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
        >
          Add user
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
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
                <td className="px-3 py-2 font-medium text-slate-900">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {u.name ?? "—"}
                    {u.employee?.archivedAt != null && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                        Archived
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">{u.email}</td>
                <td className="px-3 py-2 text-slate-700">{u.role}</td>
                <td className="px-3 py-2 text-slate-600">
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
                <td className="px-3 py-2 text-slate-600">
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
