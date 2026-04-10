import Link from "next/link";
import { notFound } from "next/navigation";
import { HourLimitScope } from "@prisma/client";
import { EmployeeHourLimitsForm } from "@/components/employee-hour-limits-form";
import { EmployeeHrDetailsForm } from "@/components/employee-hr-details-form";
import { EmployeeArchiveSection } from "@/components/employee-archive-section";
import { EmployeePhoneStaffForm } from "@/components/employee/employee-phone-staff-form";
import { EmployeeTimeClockPinForm } from "@/components/employee-time-clock-pin-form";
import { FieldRow } from "@/components/ui/field-row";
import { getSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getEffectiveHourCaps } from "@/lib/services/hours";

export default async function ManagerEmployeeHourLimitsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const session = await requireManager();
  const scope = await getSchedulingLocationIdsForSession(session);
  const { employeeId } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { name: true, email: true } },
      locations: { select: { locationId: true } },
      departments: {
        select: { department: { select: { locationId: true } } },
      },
    },
  });

  if (!employee) notFound();

  if (scope !== null) {
    if (scope.length === 0) notFound();
    const empVenues = new Set([
      ...employee.locations.map((l) => l.locationId),
      ...employee.departments.map((d) => d.department.locationId),
    ]);
    const overlap = [...empVenues].some((id) => scope.includes(id));
    if (!overlap) notFound();
  }

  const [employeeRow, effective] = await Promise.all([
    prisma.hourLimit.findFirst({
      where: {
        employeeId,
        scope: HourLimitScope.EMPLOYEE,
      },
      orderBy: { updatedAt: "desc" },
    }),
    getEffectiveHourCaps(employeeId),
  ]);

  const effectiveLabel =
    effective.weeklyMaxMinutes != null
      ? `${Math.floor(effective.weeklyMaxMinutes / 60)}h (${effective.weeklyMaxMinutes} min)`
      : "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Employee</h1>
        <Link
          href="/manager/employees"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Employees
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <FieldRow label="Name">
            <p className="text-sm font-medium text-slate-900">
              {employee.user?.name ?? "—"}
            </p>
          </FieldRow>
          <FieldRow label="Email">
            <p className="text-sm text-slate-600">{employee.user?.email}</p>
          </FieldRow>
          <EmployeePhoneStaffForm
            employeeId={employeeId}
            currentPhone={employee.phone}
          />
          <FieldRow label="Employee #">
            <p className="text-xs text-slate-500">
              {employee.employeeNumber ? `#${employee.employeeNumber}` : "—"}
            </p>
          </FieldRow>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">
          Effective weekly cap (scheduling &amp; swaps)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Tightest limit after combining this employee&apos;s settings with
          department/role rules.
        </p>
        <div className="mt-3">
          <FieldRow label="Effective cap">
            <div>
              <p className="text-sm text-slate-700">{effectiveLabel}</p>
            </div>
          </FieldRow>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Time clock PIN</h2>
        <div className="mt-4">
          <EmployeeTimeClockPinForm
            employeeId={employeeId}
            hasPin={employee.timeClockPinHash != null}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">HR details</h2>
        <p className="mt-1 text-xs text-slate-500">
          Manager notes, hourly rate or annual salary, and employment type are not visible
          to the employee.
        </p>
        <div className="mt-4">
          <EmployeeHrDetailsForm
            employeeId={employeeId}
            initialManagerNotes={employee.managerNotes}
            initialCompensationType={employee.compensationType}
            initialHourlyRate={employee.hourlyRate}
            initialAnnualSalary={employee.annualSalary}
            initialEmploymentType={employee.employmentType}
            initialHolidayPayEligible={employee.holidayPayEligible}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">
          Employee-specific weekly limit
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Only managers and admins can change this. Leave blank and save to remove
          the employee-only weekly cap.
        </p>
        <div className="mt-4">
          <EmployeeHourLimitsForm
            employeeId={employeeId}
            initialWeeklyMaxMinutes={employeeRow?.weeklyMaxMinutes ?? null}
          />
        </div>
      </section>

      <EmployeeArchiveSection
        userId={employee.userId}
        archivedAt={employee.archivedAt}
      />
    </div>
  );
}
