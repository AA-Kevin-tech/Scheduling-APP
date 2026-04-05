import Link from "next/link";
import { addHours } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { requireManager } from "@/lib/auth/guards";
import { NewShiftForm } from "@/components/manager/new-shift-form";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";
import {
  formatDatetimeLocalInTimezone,
  getDefaultScheduleTimezone,
  parseYmdTime,
} from "@/lib/schedule/tz";

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<{
    day?: string;
    week?: string;
    departmentId?: string;
    roleId?: string;
  }>;
}) {
  await requireManager();
  const departments = await getDepartmentsWithRoles();
  const params = await searchParams;
  const tz = getDefaultScheduleTimezone();

  let defaultStartsAtLocal: string;
  let defaultEndsAtLocal: string;

  if (params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day)) {
    const startUtc = fromZonedTime(parseYmdTime(params.day, 9, 0, 0), tz);
    const endUtc = fromZonedTime(parseYmdTime(params.day, 17, 0, 0), tz);
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

  const initialDepartmentId = params.departmentId;
  const initialRoleId = params.roleId;

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
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
