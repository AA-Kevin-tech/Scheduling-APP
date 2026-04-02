import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import {
  addWeeksUtc,
  parseDateParam,
  startOfWeekMondayUtc,
  toIsoDate,
} from "@/lib/datetime";
import { getShiftsForEmployee } from "@/lib/queries/schedule";

export default async function EmployeeSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { employeeId } = await requireEmployeeProfile();
  const params = await searchParams;

  const anchor = parseDateParam(params.week, new Date());
  const weekStart = startOfWeekMondayUtc(anchor);
  const weekEnd = addWeeksUtc(weekStart, 1);

  const shifts = await getShiftsForEmployee({
    employeeId,
    from: weekStart,
    to: weekEnd,
  });

  const prevWeek = addWeeksUtc(weekStart, -1);
  const nextWeek = addWeeksUtc(weekStart, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">My schedule</h1>
        <Link
          href="/employee/availability"
          className="text-sm text-sky-700 hover:underline"
        >
          Availability
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/employee/schedule?week=${toIsoDate(prevWeek)}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          ← Prev
        </Link>
        <span className="text-sm text-slate-600">
          Week of {weekStart.toLocaleDateString()}{" "}
          <span className="text-slate-400">(UTC)</span>
        </span>
        <Link
          href={`/employee/schedule?week=${toIsoDate(nextWeek)}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Next →
        </Link>
      </div>

      {shifts.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
          No shifts this week.
        </p>
      )}

      <ul className="space-y-3">
        {shifts.map((s) => {
          const badge = departmentBadgeClass(s.department.slug);
          return (
            <li
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
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
              <p className="mt-2 font-medium text-slate-900">
                {s.startsAt.toLocaleString()} → {s.endsAt.toLocaleString()}
              </p>
              {s.title && (
                <p className="text-sm text-slate-600">{s.title}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
