import Link from "next/link";

export default function ManagerSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      <p className="text-sm text-slate-600">
        Scheduling rules and structure are managed in the sections below. There
        is no separate organization-wide settings form yet.
      </p>
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
