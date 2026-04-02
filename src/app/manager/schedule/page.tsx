import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import {
  addWeeksUtc,
  parseDateParam,
  startOfWeekMondayUtc,
  toIsoDate,
} from "@/lib/datetime";
import { getDepartmentsWithRoles, getShiftsForRange } from "@/lib/queries/schedule";

export default async function ManagerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    departmentId?: string;
    roleId?: string;
  }>;
}) {
  await requireManager();
  const params = await searchParams;

  const anchor = parseDateParam(params.week, new Date());
  const weekStart = startOfWeekMondayUtc(anchor);
  const weekEnd = addWeeksUtc(weekStart, 1);

  const [shifts, departments] = await Promise.all([
    getShiftsForRange({
      from: weekStart,
      to: weekEnd,
      departmentId: params.departmentId,
      roleId: params.roleId,
    }),
    getDepartmentsWithRoles(),
  ]);

  const prevWeek = addWeeksUtc(weekStart, -1);
  const nextWeek = addWeeksUtc(weekStart, 1);

  const baseQuery = new URLSearchParams();
  if (params.departmentId) baseQuery.set("departmentId", params.departmentId);
  if (params.roleId) baseQuery.set("roleId", params.roleId);

  function weekHref(w: Date) {
    const q = new URLSearchParams(baseQuery);
    q.set("week", toIsoDate(w));
    return `/manager/schedule?${q.toString()}`;
  }

  const grouped = groupShiftsByDay(shifts);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Schedule board</h1>
        <Link
          href="/manager/shifts/new"
          className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
        >
          Create shift
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={weekHref(prevWeek)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          ← Prev week
        </Link>
        <span className="text-sm font-medium text-slate-800">
          Week of {weekStart.toLocaleDateString()}{" "}
          <span className="font-normal text-slate-500">(UTC)</span>
        </span>
        <Link
          href={weekHref(nextWeek)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Next week →
        </Link>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="week" value={toIsoDate(weekStart)} />
        <label className="text-sm">
          <span className="block text-slate-600">Department</span>
          <select
            name="departmentId"
            defaultValue={params.departmentId ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-600">Role</span>
          <select
            name="roleId"
            defaultValue={params.roleId ?? ""}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {departments.flatMap((d) =>
              d.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {d.name}: {r.name}
                </option>
              )),
            )}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900"
        >
          Apply filters
        </button>
      </form>

      {grouped.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No shifts in this week. Create one to get started.
        </p>
      )}

      <div className="space-y-8">
        {grouped.map(({ dayLabel, dayKey, items }) => (
          <section key={dayKey}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {dayLabel}
            </h2>
            <ul className="mt-2 space-y-2">
              {items.map((s) => {
                const badge = departmentBadgeClass(s.department.slug);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/manager/shifts/${s.id}`}
                      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}
                        >
                          {s.department.name}
                        </span>
                        {s.role && (
                          <span className="text-xs text-slate-500">{s.role.name}</span>
                        )}
                      </div>
                      <p className="mt-1 font-medium text-slate-900">
                        {s.startsAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {s.endsAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {s.title ? ` · ${s.title}` : ""}
                      </p>
                      <p className="text-sm text-slate-600">
                        {s.assignments.length === 0
                          ? "Unassigned"
                          : s.assignments
                              .map(
                                (a) =>
                                  a.employee.user.name ?? a.employee.user.email,
                              )
                              .join(", ")}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {items.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">No shifts.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function groupShiftsByDay(
  shifts: Awaited<ReturnType<typeof getShiftsForRange>>,
) {
  const map = new Map<string, typeof shifts>();
  for (const s of shifts) {
    const key = s.startsAt.toISOString().slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }

  const keys = [...map.keys()].sort();
  return keys.map((dayKey) => {
    const d = new Date(dayKey + "T12:00:00.000Z");
    return {
      dayKey,
      dayLabel: d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      items: map.get(dayKey) ?? [],
    };
  });
}
