import Link from "next/link";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { ProfilePhoneForm } from "@/components/employee/profile-phone-form";
import { ProfileTimezoneForm } from "@/components/employee/profile-timezone-form";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { ThemePreferenceForm } from "@/components/settings/theme-preference-form";
import { departmentBadgeClass } from "@/lib/departments/theme";
import { prisma } from "@/lib/db";
import { getEffectiveHourCaps } from "@/lib/services/hours";

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
    },
  });

  if (!employee) {
    return <p className="text-sm text-slate-600 dark:text-zinc-400">Profile not found.</p>;
  }

  const effectiveCaps = await getEffectiveHourCaps(employeeId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Profile</h1>
        <Link href="/employee" className="text-sm text-sky-700 hover:underline">
          Home
        </Link>
      </div>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Account</h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-zinc-300">
          {employee.user.name ?? "—"}
        </p>
        <p className="text-sm text-slate-600 dark:text-zinc-400">{employee.user.email}</p>
        {employee.employeeNumber && (
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">#{employee.employeeNumber}</p>
        )}
        <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
          Phone
        </h3>
        <ProfilePhoneForm currentPhone={employee.phone} />
        <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-500">
          Schedule time zone
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-500">
          Your week view and shift times use this zone.
        </p>
        <ProfileTimezoneForm currentTimezone={employee.timezone} />
      </section>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Appearance</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Light, dark, or match your device settings.
        </p>
        <ThemePreferenceForm
          initialPreference={employee.user.themePreference}
        />
      </section>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Alert preferences</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Email and SMS when schedules publish, swaps change, or time off is
          decided. SMS uses the phone number above.
        </p>
        <NotificationPreferencesForm
          notifyEmail={employee.user.notifyEmail}
          notifySms={employee.user.notifySms}
          smsOptInAt={employee.user.smsOptInAt}
        />
      </section>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Departments</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {employee.departments.map((d) => (
            <li key={d.id}>
              <span
                className={`inline-block rounded-full border px-2 py-1 text-xs ${departmentBadgeClass(
                  d.department.slug,
                  d.department.colorToken,
                )}`}
              >
                {d.department.name}
                {d.role ? ` · ${d.role.name}` : ""}
                {d.isPrimary ? " · primary" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Hour limits</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Effective weekly cap used for scheduling (your settings and department
          rules combined). Managers set limits under Employees.
        </p>
        {effectiveCaps.weeklyMaxMinutes != null ? (
          <ul className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            <li>
              Weekly cap: {Math.floor(effectiveCaps.weeklyMaxMinutes / 60)}h (
              {effectiveCaps.weeklyMaxMinutes} min)
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">No weekly cap configured.</p>
        )}
      </section>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">Certifications</h2>
        {employee.certifications.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-500">None recorded.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700 dark:text-zinc-300">
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
