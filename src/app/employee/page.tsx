import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { addWeeksUtc, startOfWeekMondayUtc } from "@/lib/datetime";
import { getEffectiveHourCaps, sumAssignedMinutesInRange } from "@/lib/services/hours";

export default async function EmployeeHomePage() {
  const { session, employeeId } = await requireEmployeeProfile();
  const name = session.user.name ?? session.user.email ?? "there";

  const weekStart = startOfWeekMondayUtc(new Date());
  const weekEnd = addWeeksUtc(weekStart, 1);
  const worked = await sumAssignedMinutesInRange(
    employeeId,
    weekStart,
    weekEnd,
  );
  const caps = await getEffectiveHourCaps(employeeId);
  const weeklyCap = caps.weeklyMaxMinutes;
  const hours = Math.floor(worked / 60);
  const capH = weeklyCap != null ? Math.floor(weeklyCap / 60) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hello, {name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your upcoming shifts and actions in one place.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500">Hours this week (UTC)</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
          {hours}h worked
          {capH != null ? ` / ${capH}h cap` : ""}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {weeklyCap != null && worked > weeklyCap * 0.9 && (
            <span className="font-medium text-amber-800">Near weekly limit · </span>
          )}
          Week of {weekStart.toLocaleDateString()}
        </p>
      </section>

      <ul className="grid gap-3">
        <li>
          <Link
            href="/employee/schedule"
            className="block min-h-[52px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50 hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">My schedule</span>
            <span className="mt-1 block text-sm text-slate-600">
              Week view and shift details
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/terminal"
            className="block min-h-[52px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50 hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Time clock</span>
            <span className="mt-1 block text-sm text-slate-600">
              Clock in or out at the work computer
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/availability"
            className="block min-h-[52px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50 hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Availability</span>
            <span className="mt-1 block text-sm text-slate-600">
              When you can usually work
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/time-off"
            className="block min-h-[52px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50 hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Time off</span>
            <span className="mt-1 block text-sm text-slate-600">
              Request and track PTO-style time away
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/swaps"
            className="block min-h-[52px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50 hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Shift swaps</span>
            <span className="mt-1 block text-sm text-slate-600">
              Request and respond to swaps
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/employee/notifications"
            className="block min-h-[52px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50 hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Notifications</span>
            <span className="mt-1 block text-sm text-slate-600">
              Swaps and schedule updates
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
