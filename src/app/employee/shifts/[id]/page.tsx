import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { departmentBadgeClass } from "@/lib/departments/theme";
import { prisma } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/schedule/tz";
import { getShiftForEmployee } from "@/lib/queries/schedule";

export default async function EmployeeShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { employeeId } = await requireEmployeeProfile();
  const { id } = await params;

  const [shift, emp] = await Promise.all([
    getShiftForEmployee({ shiftId: id, employeeId }),
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { timezone: true },
    }),
  ]);

  if (!shift) notFound();

  const tz = normalizeIanaTimezone(emp?.timezone);
  const badge = departmentBadgeClass(shift.department.slug);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/employee/schedule"
          className="text-sm text-sky-700 hover:underline"
        >
          ← My schedule
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}
        >
          {shift.department.name}
        </span>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">
          {shift.title || "Shift"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {formatInTimeZone(shift.startsAt, tz, "MMM d, yyyy h:mm a")} →{" "}
          {formatInTimeZone(shift.endsAt, tz, "MMM d, yyyy h:mm a")}
        </p>
        <p className="mt-1 text-xs text-slate-400">{tz}</p>
        {shift.role && (
          <p className="mt-2 text-sm text-slate-600">Role: {shift.role.name}</p>
        )}
        {shift.zone && (
          <p className="text-sm text-slate-600">Zone: {shift.zone.name}</p>
        )}
        {shift.location && (
          <p className="text-sm text-slate-600">Location: {shift.location.name}</p>
        )}
      </div>
    </div>
  );
}
