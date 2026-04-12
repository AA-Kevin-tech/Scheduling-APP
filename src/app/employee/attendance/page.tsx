import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  sumWorkedMinutesInIsoWeek,
  sumWorkedMinutesLastDaysUtc,
} from "@/lib/time-clock/worked-minutes";
import { addWeeksUtc, startOfWeekMondayUtc } from "@/lib/datetime";
import { getEmployeeAccountClockEnabled } from "@/lib/queries/organization-settings";

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default async function EmployeeAttendancePage() {
  const { employeeId } = await requireEmployeeProfile();
  const now = new Date();

  const [weekMinutes, last30Minutes, punches, allowWebClock] = await Promise.all([
    sumWorkedMinutesInIsoWeek(employeeId, now),
    sumWorkedMinutesLastDaysUtc(employeeId, 30, now),
    prisma.shiftTimePunch.findMany({
      where: { assignment: { employeeId } },
      include: {
        assignment: {
          include: {
            shift: {
              include: {
                department: { select: { name: true } },
                role: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { clockInAt: "desc" },
      take: 150,
    }),
    getEmployeeAccountClockEnabled(),
  ]);

  const weekStart = startOfWeekMondayUtc(now);
  const weekEnd = addWeeksUtc(weekStart, 1);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/employee"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Home
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-slate-600">
          {allowWebClock
            ? "Your punches from the kiosk or from your employee home screen. This page is read-only; for corrections, contact a manager or administrator."
            : "Time clock punches from the work terminal (read-only). For corrections, contact a manager or administrator."}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            This week (UTC)
          </h2>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {formatHoursMinutes(weekMinutes)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()}
          </p>
        </div>
        <div className="surface-card p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Last 30 days (UTC)
          </h2>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {formatHoursMinutes(last30Minutes)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Punched time only</p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-800">Punch history</h2>
        {punches.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No time punches yet. Clock in from the{" "}
            <Link href="/terminal" className="text-sky-700 hover:underline">
              time clock
            </Link>{" "}
            when you are at work.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto surface-card">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Clock in</th>
                  <th className="px-3 py-2">Clock out</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Shift / role</th>
                </tr>
              </thead>
              <tbody>
                {punches.map((p) => {
                  const shift = p.assignment.shift;
                  const end = p.clockOutAt ?? now;
                  const durationMin = Math.max(
                    0,
                    Math.round((end.getTime() - p.clockInAt.getTime()) / 60000),
                  );
                  const open = p.clockOutAt == null;
                  const roleLabel = shift.role?.name;
                  const dept = shift.department.name;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                        {p.clockInAt.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                        {p.clockOutAt
                          ? p.clockOutAt.toLocaleString()
                          : (
                              <span className="font-medium text-amber-800">
                                Open
                              </span>
                            )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                        {formatHoursMinutes(durationMin)}
                        {open ? " · still running" : ""}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        <span className="block">{dept}</span>
                        {roleLabel ? (
                          <span className="text-xs text-slate-500">{roleLabel}</span>
                        ) : null}
                        <span className="mt-0.5 block text-xs text-slate-400">
                          Scheduled{" "}
                          {shift.startsAt.toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {shift.endsAt.toLocaleString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
