import Link from "next/link";
import { AdminTimeClockSettingsForm } from "@/components/admin/admin-time-clock-settings-form";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

const SINGLETON_ID = "singleton" as const;

export default async function AdminTimeClockSettingsPage() {
  await requireAdmin();

  const row = await prisma.organizationSettings.findUnique({
    where: { id: SINGLETON_ID },
    select: { employeeAccountClockEnabled: true },
  });
  const employeeAccountClockEnabled = row?.employeeAccountClockEnabled ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Admin
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Time clock access
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Organization-wide rule for employee clock-in and clock-out. Admins,
          IT, and Payroll can change this setting.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <AdminTimeClockSettingsForm
          employeeAccountClockEnabled={employeeAccountClockEnabled}
        />
      </section>
    </div>
  );
}
