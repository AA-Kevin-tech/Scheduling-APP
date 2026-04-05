import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import { getEmployeesWithDepartments } from "@/lib/queries/schedule";

export default async function ManagerEmployeesPage() {
  await requireManager();
  const employees = await getEmployeesWithDepartments();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Employees</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/manager/employees/new" className="text-sky-700 hover:underline">
            Add employee
          </Link>
          <Link href="/manager/schedule" className="text-sky-700 hover:underline">
            Schedule board
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Locations</th>
              <th className="px-3 py-2">Departments</th>
              <th className="px-3 py-2">Hour limits</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 font-medium text-slate-900">
                  {e.user?.name ?? "—"}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {e.user?.email ?? "—"}
                </td>
                <td className="px-3 py-2 text-slate-500">{e.employeeNumber ?? "—"}</td>
                <td className="px-3 py-2">
                  <ul className="flex flex-wrap gap-1">
                    {e.locations.length === 0 ? (
                      <li className="text-slate-400">—</li>
                    ) : (
                      e.locations.map((el) => (
                        <li
                          key={el.id}
                          className="text-xs text-slate-600"
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
                    className="text-sky-700 hover:underline"
                  >
                    Set
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
