import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth/guards";
import {
  AdminCorrectPunchForm,
  AdminCreatePunchForm,
} from "@/components/admin/payroll-correction-forms";
import {
  listAssignmentsWithoutPunchOverlappingDay,
  listPunchesOverlappingAdminDay,
} from "@/lib/queries/admin-payroll-corrections";
import {
  formatDatetimeLocalInTimezone,
  getDefaultScheduleTimezone,
  parseYmdTime,
  todayIsoInZone,
} from "@/lib/schedule/tz";

function addCalendarDaysInZone(isoKey: string, delta: number, tz: string): string {
  const noonUtc = fromZonedTime(parseYmdTime(isoKey, 12, 0, 0), tz);
  const z = toZonedTime(noonUtc, tz);
  const shifted = addDays(z, delta);
  shifted.setHours(12, 0, 0, 0);
  return formatInTimeZone(fromZonedTime(shifted, tz), tz, "yyyy-MM-dd");
}

export default async function AdminPayrollCorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const tz = getDefaultScheduleTimezone();
  const sp = await searchParams;
  const raw = typeof sp.date === "string" ? sp.date.trim() : "";
  const isoKey =
    raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayIsoInZone(new Date(), tz);

  const prevIso = addCalendarDaysInZone(isoKey, -1, tz);
  const nextIso = addCalendarDaysInZone(isoKey, 1, tz);

  const [punches, missing] = await Promise.all([
    listPunchesOverlappingAdminDay(isoKey, tz),
    listAssignmentsWithoutPunchOverlappingDay(isoKey, tz),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Payroll time corrections</h1>
        <p className="mt-2 text-sm text-slate-600">
          Adjust kiosk time punches or add a missing punch after the fact. Every change is
          written to the audit log with your user and a required reason. Times use the org
          default timezone ({tz}).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <Link
          href={`/admin/payroll-corrections?date=${prevIso}`}
          className="text-sky-700 hover:underline"
        >
          ← Previous day
        </Link>
        <form action="/admin/payroll-corrections" method="get" className="flex items-center gap-2">
          <label className="text-slate-600">
            Date
            <input
              type="date"
              name="date"
              defaultValue={isoKey}
              className="ml-2 rounded-md border border-slate-300 px-2 py-1"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50"
          >
            Go
          </button>
        </form>
        <Link
          href={`/admin/payroll-corrections?date=${nextIso}`}
          className="text-sky-700 hover:underline"
        >
          Next day →
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-800">
          Punches on this day ({punches.length})
        </h2>
        {punches.length === 0 ? (
          <p className="text-sm text-slate-500">No punches overlap this calendar day.</p>
        ) : (
          <ul className="space-y-4">
            {punches.map((row) => (
              <li
                key={row.punchId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-sm">
                  <span className="font-medium text-slate-900">{row.employeeLabel}</span>
                  <span className="text-slate-500"> · {row.departmentName}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Scheduled {row.shiftStartsAt.toLocaleString()} →{" "}
                  {row.shiftEndsAt.toLocaleString()}
                </p>
                <AdminCorrectPunchForm
                  row={row}
                  clockInLocal={formatDatetimeLocalInTimezone(row.clockInAt, tz)}
                  clockOutLocal={
                    row.clockOutAt
                      ? formatDatetimeLocalInTimezone(row.clockOutAt, tz)
                      : ""
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-800">
          Published shifts this day without a punch ({missing.length})
        </h2>
        <p className="text-xs text-slate-500">
          Use only when the employee truly worked; defaults follow scheduled start/end.
        </p>
        {missing.length === 0 ? (
          <p className="text-sm text-slate-500">No gaps for this day.</p>
        ) : (
          <ul className="space-y-4">
            {missing.map((row) => (
              <li
                key={row.assignmentId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-sm">
                  <span className="font-medium text-slate-900">{row.employeeLabel}</span>
                  <span className="text-slate-500"> · {row.departmentName}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Scheduled {row.shiftStartsAt.toLocaleString()} →{" "}
                  {row.shiftEndsAt.toLocaleString()}
                </p>
                <AdminCreatePunchForm
                  row={row}
                  defaultClockInLocal={formatDatetimeLocalInTimezone(
                    row.shiftStartsAt,
                    tz,
                  )}
                  defaultClockOutLocal={formatDatetimeLocalInTimezone(
                    row.shiftEndsAt,
                    tz,
                  )}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
