import Link from "next/link";
import { notFound } from "next/navigation";
import { HourLimitScope } from "@prisma/client";
import { EmployeeHourLimitsForm } from "@/components/employee-hour-limits-form";
import { requireManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getEffectiveHourCaps } from "@/lib/services/hours";

export default async function ManagerEmployeeHourLimitsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireManager();
  const { employeeId } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  if (!employee) notFound();

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Hour limits</h1>
        <Link
          href="/manager/employees"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Employees
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-800">
          {employee.user?.name ?? "—"}
        </p>
        <p className="text-sm text-slate-600">{employee.user?.email}</p>
        {employee.employeeNumber && (
          <p className="mt-1 text-xs text-slate-500">#{employee.employeeNumber}</p>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">
          Effective caps (scheduling &amp; swaps)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Tightest limit after combining this employee&apos;s settings with
          department/role rules.
        </p>
        <ul className="mt-3 text-sm text-slate-700">
          <li>
            Weekly:{" "}
            {effective.weeklyMaxMinutes != null
              ? `${Math.floor(effective.weeklyMaxMinutes / 60)}h (${effective.weeklyMaxMinutes} min)`
              : "—"}
          </li>
          <li>
            Daily:{" "}
            {effective.dailyMaxMinutes != null
              ? `${Math.floor(effective.dailyMaxMinutes / 60)}h (${effective.dailyMaxMinutes} min)`
              : "—"}
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">
          Employee-specific limits
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Only managers and admins can change these. Clear both fields and save
          to remove employee-only caps.
        </p>
        <div className="mt-4">
          <EmployeeHourLimitsForm
            employeeId={employeeId}
            initialWeeklyMaxMinutes={employeeRow?.weeklyMaxMinutes ?? null}
            initialDailyMaxMinutes={employeeRow?.dailyMaxMinutes ?? null}
          />
        </div>
      </section>
    </div>
  );
}
