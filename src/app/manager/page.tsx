import Link from "next/link";
import { auth } from "@/auth";
import { addWeeksUtc, startOfWeekMondayUtc } from "@/lib/datetime";
import { prisma } from "@/lib/db";
import { getTimeClockIssueCounts } from "@/lib/queries/time-clock-issues";
import { computeDepartmentCoverage } from "@/lib/services/coverage";
import { ensureTimeClockIssueNotifications } from "@/lib/services/time-clock-notify";
import { countPendingSwapsForManager } from "@/lib/queries/swaps";
import { countPendingTimeOffRequests } from "@/lib/queries/time-off";

export default async function ManagerDashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "Manager";

  const weekStart = startOfWeekMondayUtc(new Date());
  const weekEnd = addWeeksUtc(weekStart, 1);
  const now = new Date();

  const [swapCounts, coverageRows, openShifts, pendingTimeOff, timeClock] =
    await Promise.all([
      countPendingSwapsForManager(),
      computeDepartmentCoverage({
        rangeStart: weekStart,
        rangeEnd: weekEnd,
      }),
      prisma.shift.count({
        where: {
          startsAt: { gte: new Date() },
          assignments: { none: {} },
        },
      }),
      countPendingTimeOffRequests(),
      (async () => {
        await ensureTimeClockIssueNotifications(now);
        return getTimeClockIssueCounts(now);
      })(),
    ]);

  const coverageGapDays = coverageRows.filter((r) => r.gap > 0).length;
  const pendingTotal = swapCounts.pending + swapCounts.awaitingManager;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Dashboard — {name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Department-first scheduling, coverage, and approvals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Link
          href="/manager/schedule"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
        >
          <p className="text-sm text-slate-500">Unassigned future shifts</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {openShifts}
          </p>
          <p className="mt-1 text-xs text-slate-400">Needs staffing</p>
        </Link>
        <Link
          href="/manager/swaps"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
        >
          <p className="text-sm text-slate-500">Swap queue</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {pendingTotal}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {swapCounts.pending} pending · {swapCounts.awaitingManager} ready
          </p>
        </Link>
        <Link
          href="/manager/time-off"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
        >
          <p className="text-sm text-slate-500">Time off pending</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {pendingTimeOff}
          </p>
          <p className="mt-1 text-xs text-slate-400">Awaiting approval</p>
        </Link>
        <Link
          href="/manager/coverage"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
        >
          <p className="text-sm text-slate-500">Coverage gaps (week)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {coverageGapDays}
          </p>
          <p className="mt-1 text-xs text-slate-400">Day × dept below min</p>
        </Link>
        <Link
          href="/manager/time-clock"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
        >
          <p className="text-sm text-slate-500">Time clock issues</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {timeClock.total}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Open punch · missing in · no punch
          </p>
        </Link>
      </div>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Shortcuts</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <Link href="/manager/shifts/new" className="text-sky-700 hover:underline">
              Create shift
            </Link>
          </li>
          <li>
            <Link href="/manager/employees" className="text-sky-700 hover:underline">
              Employees
            </Link>
          </li>
          <li>
            <Link href="/manager/audit" className="text-sky-700 hover:underline">
              Audit log
            </Link>
          </li>
          <li>
            <Link href="/manager/time-off" className="text-sky-700 hover:underline">
              Time off
            </Link>
          </li>
          <li>
            <Link href="/manager/notifications" className="text-sky-700 hover:underline">
              Notifications
            </Link>
          </li>
          <li>
            <Link href="/manager/time-clock" className="text-sky-700 hover:underline">
              Time clock issues
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
