import Link from "next/link";
import { TimeClockIssuesPanel } from "@/components/manager/time-clock-issues";
import {
  getMissingClockInsDuringShift,
  getMissedShiftsWithoutPunch,
  getOpenPunchesPastShiftEnd,
} from "@/lib/queries/time-clock-issues";
import { ensureTimeClockIssueNotifications } from "@/lib/services/time-clock-notify";

export default async function ManagerTimeClockPage() {
  const now = new Date();
  await ensureTimeClockIssueNotifications(now);

  const [openPastEnd, missingClockIn, missedNoPunch] = await Promise.all([
    getOpenPunchesPastShiftEnd(now),
    getMissingClockInsDuringShift(now),
    getMissedShiftsWithoutPunch(now),
  ]);

  const total = openPastEnd.length + missingClockIn.length + missedNoPunch.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Time clock issues</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kiosk/tablet punches only (no geofence). Alerts also appear under{" "}
            <Link href="/manager/notifications" className="text-sky-700 hover:underline">
              Alerts
            </Link>
            .
          </p>
        </div>
        <p className="text-sm text-slate-500">
          <span className="font-medium tabular-nums text-slate-800">{total}</span> open
          issue{total === 1 ? "" : "s"}
        </p>
      </div>

      <TimeClockIssuesPanel
        openPastEnd={openPastEnd}
        missingClockIn={missingClockIn}
        missedNoPunch={missedNoPunch}
      />
    </div>
  );
}
