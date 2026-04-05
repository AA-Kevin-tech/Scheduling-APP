import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { ProfileTimezoneForm } from "@/components/employee/profile-timezone-form";
import { departmentBadgeClass } from "@/lib/departments/theme";
import { prisma } from "@/lib/db";

export default async function EmployeeProfilePage() {
  const { employeeId } = await requireEmployeeProfile();

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      user: true,
      departments: {
        include: { department: true, role: true },
      },
      certifications: { include: { department: true } },
      hourLimits: true,
    },
  });

  if (!employee) {
    return <p className="text-sm text-slate-600">Profile not found.</p>;
  }

  const hl = employee.hourLimits[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
        <Link href="/employee" className="text-sm text-sky-700 hover:underline">
          Home
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Account</h2>
        <p className="mt-2 text-sm text-slate-700">
          {employee.user.name ?? "—"}
        </p>
        <p className="text-sm text-slate-600">{employee.user.email}</p>
        {employee.employeeNumber && (
          <p className="mt-1 text-xs text-slate-500">#{employee.employeeNumber}</p>
        )}
        <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
          Schedule time zone
        </h3>
        <p className="text-xs text-slate-500">
          Your week view and shift times use this zone.
        </p>
        <ProfileTimezoneForm currentTimezone={employee.timezone} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Departments</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {employee.departments.map((d) => (
            <li key={d.id}>
              <span
                className={`inline-block rounded-full border px-2 py-1 text-xs ${departmentBadgeClass(d.department.slug)}`}
              >
                {d.department.name}
                {d.role ? ` · ${d.role.name}` : ""}
                {d.isPrimary ? " · primary" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Hour limits</h2>
        {hl ? (
          <ul className="mt-2 text-sm text-slate-600">
            {hl.weeklyMaxMinutes != null && (
              <li>
                Weekly cap: {Math.floor(hl.weeklyMaxMinutes / 60)}h (
                {hl.weeklyMaxMinutes} min)
              </li>
            )}
            {hl.dailyMaxMinutes != null && (
              <li>
                Daily cap: {Math.floor(hl.dailyMaxMinutes / 60)}h (
                {hl.dailyMaxMinutes} min)
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No limits on file.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Certifications</h2>
        {employee.certifications.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">None recorded.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {employee.certifications.map((c) => (
              <li key={c.id}>
                {c.name}
                {c.department && ` · ${c.department.name}`}
                {c.expiresAt && ` (expires ${c.expiresAt.toLocaleDateString()})`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
