import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";
import { ManagerAccountPhoneForm } from "@/components/settings/manager-account-phone-form";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { prisma } from "@/lib/db";

export default async function ManagerSettingsPage() {
  const session = await requireManager();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      notifyEmail: true,
      notifySms: true,
      smsOptInAt: true,
      phoneE164: true,
    },
  });

  if (!user) {
    return <p className="text-sm text-slate-600">Account not found.</p>;
  }

  const noEmployee = !session.user.employeeId;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      <p className="text-sm text-slate-600">
        Scheduling rules and structure are managed in the sections below. There
        is no separate organization-wide settings form yet.
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Alert preferences</h2>
        <p className="mt-1 text-xs text-slate-500">
          Email and SMS for swap requests, time off, schedule publishes, and
          time-clock alerts. Requires Resend (email) and Twilio (SMS) on the
          server.
        </p>
        <NotificationPreferencesForm
          notifyEmail={user.notifyEmail}
          notifySms={user.notifySms}
          smsOptInAt={user.smsOptInAt}
        />
        {noEmployee ? (
          <>
            <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500">
              Mobile for text alerts
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Manager-only accounts do not have an employee profile. Save a
              mobile number here so SMS can reach you.
            </p>
            <ManagerAccountPhoneForm currentPhoneE164={user.phoneE164} />
          </>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            SMS uses the phone on your{" "}
            <Link href="/employee/profile" className="text-sky-700 hover:underline">
              employee profile
            </Link>
            .
          </p>
        )}
      </section>

      <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
        <li>
          <Link href="/manager/departments" className="text-sky-700 hover:underline">
            Departments
          </Link>{" "}
          — directory and structure (zones and roles are seeded with departments).
        </li>
        <li>
          <Link href="/manager/coverage" className="text-sky-700 hover:underline">
            Coverage
          </Link>{" "}
          — minimum staffing vs scheduled headcount by day.
        </li>
        <li>
          <Link href="/manager/employees" className="text-sky-700 hover:underline">
            Employees
          </Link>{" "}
          — roster and assignments to departments.
        </li>
        <li>
          <Link href="/manager/audit" className="text-sky-700 hover:underline">
            Audit log
          </Link>{" "}
          — record of scheduling and approval actions.
        </li>
      </ul>
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">Payroll:</span>{" "}
        administrators connect QuickBooks Online under{" "}
        <span className="text-slate-800">Admin → Integrations</span> (not shown
        in the manager sidebar).
      </p>
      <p className="text-xs text-slate-500">
        Minimum rest between shifts defaults to 480 minutes unless{" "}
        <code className="rounded bg-slate-100 px-1">MIN_REST_MINUTES</code> is
        set in the server environment (see README).
      </p>
    </div>
  );
}
