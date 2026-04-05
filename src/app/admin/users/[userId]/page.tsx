import Link from "next/link";
import { notFound } from "next/navigation";
import { HourLimitScope } from "@prisma/client";
import { EmployeeHourLimitsForm } from "@/components/employee-hour-limits-form";
import { EmployeeHrDetailsForm } from "@/components/employee-hr-details-form";
import { EmployeeUserForm } from "@/components/admin/employee-user-form";
import { EmployeeArchiveSection } from "@/components/employee-archive-section";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getLocations, getUserForAdminEdit } from "@/lib/queries/admin";
import { getDepartmentsWithRoles } from "@/lib/queries/schedule";
import { getEffectiveHourCaps } from "@/lib/services/hours";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
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
    name: d.name,
    roles: d.roles.map((r) => ({ id: r.id, name: r.name })),
  }));

  const initial = {
    email: user.email,
    name: user.name ?? "",
    role: user.role,
    employeeNumber: user.employee.employeeNumber,
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

      <EmployeeArchiveSection
        userId={user.id}
        archivedAt={user.employee.archivedAt}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">HR details</h2>
        <p className="mt-1 text-xs text-slate-500">
          Manager notes, pay rate, and employment type are not visible to the employee.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          <span className="text-slate-500">Phone (employee-editable): </span>
          {user.employee.phone ?? "—"}
        </p>
        <div className="mt-4">
          <EmployeeHrDetailsForm
            employeeId={employeeId}
            initialManagerNotes={user.employee.managerNotes}
            initialHourlyRate={user.employee.hourlyRate}
            initialEmploymentType={user.employee.employmentType}
            adminUserIdForRevalidate={user.id}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Hour limits</h2>
        <p className="mt-1 text-xs text-slate-500">
          Effective weekly cap (scheduling and swaps):{" "}
          {effectiveCaps.weeklyMaxMinutes != null
            ? `${Math.floor(effectiveCaps.weeklyMaxMinutes / 60)}h`
            : "—"}
          . Department limits may tighten this.
        </p>
        <div className="mt-4">
          <EmployeeHourLimitsForm
            employeeId={employeeId}
            initialWeeklyMaxMinutes={employeeCapRow?.weeklyMaxMinutes ?? null}
            adminUserIdForRevalidate={user.id}
          />
        </div>
      </div>
    </div>
  );
}
