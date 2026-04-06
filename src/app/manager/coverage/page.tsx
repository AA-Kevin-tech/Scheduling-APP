import Link from "next/link";
import { connection } from "next/server";
import { requireManager } from "@/lib/auth/guards";
import {
  addWeeksUtc,
  parseDateParam,
  startOfWeekMondayUtc,
  toIsoDate,
} from "@/lib/datetime";
import { computeDepartmentCoverage, summarizeCoverage } from "@/lib/services/coverage";

export default async function ManagerCoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  await connection();
  await requireManager();
  const params = await searchParams;
  const anchor = parseDateParam(params.week, new Date());
  const weekStart = startOfWeekMondayUtc(anchor);
  const weekEnd = addWeeksUtc(weekStart, 1);

  const rows = await computeDepartmentCoverage({
    rangeStart: weekStart,
    rangeEnd: weekEnd,
  });
  const summary = summarizeCoverage(rows);

  const prevWeek = addWeeksUtc(weekStart, -1);
  const nextWeek = addWeeksUtc(weekStart, 1);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">
          Department coverage
        </h1>
        <Link
          href="/manager/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          Schedule board
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        Required headcounts come from coverage rules your administrator sets for
        each department (and optional zones). Published shifts only count toward
        scheduled staff.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/manager/coverage?week=${toIsoDate(prevWeek)}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          ← Prev week
        </Link>
        <span className="text-sm font-medium text-slate-800">
          Week of {weekStart.toLocaleDateString()}{" "}
          <span className="font-normal text-slate-500">(UTC)</span>
        </span>
        <Link
          href={`/manager/coverage?week=${toIsoDate(nextWeek)}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Next week →
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Summary</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {Object.entries(summary.byDepartment).map(([id, s]) => (
            <li key={id}>
              <span className="font-medium text-slate-800">{s.name}</span>:{" "}
              {s.daysBelowMin > 0 ? (
                <span className="text-amber-800">
                  {s.daysBelowMin} day(s) below minimum (worst gap {s.worstGap})
                </span>
              ) : (
                <span className="text-emerald-800">OK vs rules</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2 text-right">Scheduled</th>
              <th className="px-3 py-2 text-right">Required</th>
              <th className="px-3 py-2 text-right">Gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.date}-${r.departmentId}`}
                className={r.gap > 0 ? "bg-amber-50" : ""}
              >
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.departmentName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.scheduled}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.required}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.gap > 0 ? (
                    <span className="font-medium text-amber-900">+{r.gap}</span>
                  ) : (
                    "—"
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
