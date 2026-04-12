import Link from "next/link";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import { getEmployeesWithDepartments } from "@/lib/queries/schedule";
import { firstSearchParam } from "@/lib/search-params";

export default async function ManagerEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string | string[] }>;
}) {
  const session = await requireManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const raw = await searchParams;
  const showAllStaff = firstSearchParam(raw.staff) === "all";
  const employees = await getEmployeesWithDepartments({
    includeArchived: showAllStaff,
    onlyAtLocations: locationIds ?? undefined,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Employees</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {showAllStaff ? (
            <Link href="/manager/employees" className="link-app">
              Active only
            </Link>
          ) : (
            <Link
              href="/manager/employees?staff=all"
              className="link-app"
            >
              Include archived
            </Link>
          )}
          <Link
            href="/manager/employees/onboarding"
            className="link-app"
          >
            Onboarding tracker
          </Link>
          <Link href="/manager/employees/invite" className="link-app">
            Invite employee
          </Link>
          <Link href="/manager/employees/new" className="link-app">
            Add employee
          </Link>
          <Link href="/manager/schedule" className="link-app">
            Schedule board
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto surface-card">
        <table className="min-w-full text-left text-sm">
          <thead className="table-head-row">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Locations</th>
              <th className="px-3 py-2">Departments</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr
                key={e.id}
                className={`table-row-divider last:border-0 ${e.archivedAt ? "bg-slate-50/80 dark:bg-zinc-950/60" : ""}`}
              >
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-zinc-100">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {e.user?.name ?? "—"}
                    {e.archivedAt && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-zinc-300">
                        Archived
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">
                  {e.user?.email ?? "—"}
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-zinc-500">{e.employeeNumber ?? "—"}</td>
                <td className="px-3 py-2">
                  <ul className="flex flex-wrap gap-1">
                    {e.locations.length === 0 ? (
                      <li className="text-slate-400 dark:text-zinc-500">—</li>
                    ) : (
                      e.locations.map((el) => (
                        <li
                          key={el.id}
                          className="text-xs text-slate-600 dark:text-zinc-400"
                        >
                          {el.location?.name ?? "—"}
                          {el.isPrimary ? " · primary" : ""}
                        </li>
                      ))
                    )}
                  </ul>
                </td>
                <td className="px-3 py-2">
                  <ul className="flex flex-wrap gap-1">
                    {e.departments.map((ed) => (
                      <li key={ed.id}>
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-xs ${departmentBadgeClass(
                            ed.department?.slug ?? "",
                          )}`}
                        >
                          {ed.department?.name ?? "—"}
                          {ed.role ? ` · ${ed.role.name}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/manager/employees/${e.id}`}
                    className="link-app"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
