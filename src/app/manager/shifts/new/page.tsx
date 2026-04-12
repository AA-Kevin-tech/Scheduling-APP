import Link from "next/link";
import { addHours } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { NewShiftForm } from "@/components/manager/new-shift-form";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";
import {
  formatDatetimeLocalInTimezone,
  getDefaultScheduleTimezone,
  parseYmdTime,
} from "@/lib/schedule/tz";
import { firstSearchParam } from "@/lib/search-params";

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<{
    day?: string | string[];
    week?: string | string[];
    departmentId?: string | string[];
    roleId?: string | string[];
  }>;
}) {
  const session = await requireManager();
  const locationIds = await getSchedulingLocationIdsForSession(session);
  const departments = await getDepartmentsWithRoles({
    onlyAtLocations: locationIds ?? undefined,
  });
  const raw = await searchParams;
  const day = firstSearchParam(raw.day);
  const initialDepartmentId = firstSearchParam(raw.departmentId);
  const initialRoleId = firstSearchParam(raw.roleId);
  const tz = getDefaultScheduleTimezone();

  let defaultStartsAtLocal: string;
  let defaultEndsAtLocal: string;

  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const startUtc = fromZonedTime(parseYmdTime(day, 9, 0, 0), tz);
    const endUtc = fromZonedTime(parseYmdTime(day, 17, 0, 0), tz);
    defaultStartsAtLocal = formatDatetimeLocalInTimezone(startUtc, tz);
    defaultEndsAtLocal = formatDatetimeLocalInTimezone(endUtc, tz);
  } else {
    const z = toZonedTime(new Date(), tz);
    z.setMinutes(0, 0, 0);
    z.setHours(z.getHours() + 1);
    const startUtc = fromZonedTime(z, tz);
    const zEnd = addHours(z, 1);
    const endUtc = fromZonedTime(zEnd, tz);
    defaultStartsAtLocal = formatDatetimeLocalInTimezone(startUtc, tz);
    defaultEndsAtLocal = formatDatetimeLocalInTimezone(endUtc, tz);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/manager/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Schedule
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">Create shift</h1>
      <p className="text-sm text-slate-600">
        Shifts can repeat weekly; each occurrence is stored as its own row (series
        link via parent shift).
      </p>
      <div className="surface-card p-6">
        <NewShiftForm
          departments={departments}
          scheduleTimeZone={tz}
          defaultStartsAtLocal={defaultStartsAtLocal}
          defaultEndsAtLocal={defaultEndsAtLocal}
          initialDepartmentId={initialDepartmentId}
          initialRoleId={initialRoleId}
        />
      </div>
    </div>
  );
}
