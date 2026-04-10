import Link from "next/link";
import { notFound } from "next/navigation";
import { HourLimitScope } from "@prisma/client";
import { auth } from "@/auth";
import { AdminDeleteUserSection } from "@/components/admin/admin-delete-user-section";
import { EmployeeHourLimitsForm } from "@/components/employee-hour-limits-form";
import { EmployeeHrDetailsForm } from "@/components/employee-hr-details-form";
import { EmployeeUserForm } from "@/components/admin/employee-user-form";
import { EmployeeArchiveSection } from "@/components/employee-archive-section";
import { EmployeeTimeClockPinForm } from "@/components/employee-time-clock-pin-form";
import { FieldRow } from "@/components/ui/field-row";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getLocations, getUserForAdminEdit } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";
import { getEffectiveHourCaps } from "@/lib/services/hours";
import { initialFirstLastFromUser } from "@/lib/user-display-name";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const session = await auth();
  const { userId } = await params;

  const [user, locations, departments] = await Promise.all([
    getUserForAdminEdit(userId),
    getLocations(),
    getDepartmentsWithRoles(),
  ]);

  if (!user?.employee) notFound();

  const employeeId = user.employee.id;

  const [employeeCapRow, effectiveCaps] = await Promise.all([
    prisma.hourLimit.findFirst({
      where: {
        employeeId,
        scope: HourLimitScope.EMPLOYEE,
      },
      orderBy: { updatedAt: "desc" },
    }),
    getEffectiveHourCaps(employeeId),
  ]);

  const deptOptions = departments.map((d) => ({
    id: d.id,
    name: d.location ? `${d.name} (${d.location.name})` : d.name,
    roles: d.roles.map((r) => ({ id: r.id, name: r.name })),
  }));

  const effectiveWeeklyLabel =
    effectiveCaps.weeklyMaxMinutes != null
      ? `${Math.floor(effectiveCaps.weeklyMaxMinutes / 60)}h`
      : "—";

  const { firstName, lastName } = initialFirstLastFromUser({
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
  });

  const initial = {
    email: user.email,
    firstName,
    lastName,
    role: user.role,
    employeeNumber: user.employee.employeeNumber,
    phone: user.employee.phone,
    timezone: user.employee.timezone,
    locationIds: user.employee.locations.map((l) => l.locationId),
    assignments: user.employee.departments.map((ed) => ({
      departmentId: ed.departmentId,
      roleId: ed.roleId,
      isPrimary: ed.isPrimary,
    })),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Edit user</h1>
        <Link
          href="/admin/users"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Users
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmployeeUserForm
          mode="edit"
          userId={user.id}
          isAdminContext
          initial={initial}
          departments={deptOptions}
          locations={locations}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Time clock PIN</h2>
        <div className="mt-4">
          <EmployeeTimeClockPinForm
            employeeId={employeeId}
            hasPin={user.employee.timeClockPinHash != null}
            adminUserIdForRevalidate={user.id}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">HR details</h2>
        <p className="mt-1 text-xs text-slate-500">
          Manager notes, hourly rate or annual salary, and employment type are not visible
          to the employee.
        </p>
        <div className="mt-4">
          <EmployeeHrDetailsForm
            employeeId={employeeId}
            initialManagerNotes={user.employee.managerNotes}
            initialCompensationType={user.employee.compensationType}
            initialHourlyRate={user.employee.hourlyRate}
            initialAnnualSalary={user.employee.annualSalary}
            initialEmploymentType={user.employee.employmentType}
            initialHolidayPayEligible={user.employee.holidayPayEligible}
            adminUserIdForRevalidate={user.id}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Hour limits</h2>
        <p className="mt-1 text-xs text-slate-500">
          Department limits may tighten the effective cap below.
        </p>
        <div className="mt-3">
          <FieldRow label="Effective weekly cap">
            <div>
              <p className="text-sm text-slate-700">{effectiveWeeklyLabel}</p>
              <p className="mt-1 text-xs text-slate-500">
                Scheduling and swaps use this effective cap.
              </p>
            </div>
          </FieldRow>
        </div>
        <div className="mt-4">
          <EmployeeHourLimitsForm
            employeeId={employeeId}
            initialWeeklyMaxMinutes={employeeCapRow?.weeklyMaxMinutes ?? null}
            adminUserIdForRevalidate={user.id}
          />
        </div>
      </div>

      <EmployeeArchiveSection
        userId={user.id}
        archivedAt={user.employee.archivedAt}
      />

      {session?.user?.id && session.user.id !== user.id ? (
        <AdminDeleteUserSection userId={user.id} userEmail={user.email} />
      ) : null}
    </div>
  );
}
