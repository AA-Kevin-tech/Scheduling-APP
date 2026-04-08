import Link from "next/link";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";

export default async function ManagerDepartmentsPage() {
  const session = await requireManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const departments = await getDepartmentsWithRoles({
    onlyAtLocations: locationIds ?? undefined,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Departments</h1>
        <Link
          href="/manager/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          Schedule board
        </Link>
      </div>

      <ul className="space-y-4">
        {departments.map((d) => {
          const badge = departmentBadgeClass(d.slug);
          return (
            <li
              key={d.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}
                >
                  {d.name}
                </span>
                <span className="text-xs text-slate-500">
                  {d.location.name} · {d.slug}
                </span>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-medium uppercase text-slate-500">
                    Roles
                  </h3>
                  <ul className="mt-1 text-sm text-slate-700">
                    {d.roles.map((r) => (
                      <li key={r.id}>
                        {r.name} <span className="text-slate-400">({r.slug})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase text-slate-500">
                    Zones
                  </h3>
                  <ul className="mt-1 text-sm text-slate-700">
                    {d.zones.length === 0 ? (
                      <li className="text-slate-400">None yet</li>
                    ) : (
                      d.zones.map((z) => (
                        <li key={z.id}>
                          {z.name}{" "}
                          <span className="text-slate-400">({z.slug})</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
