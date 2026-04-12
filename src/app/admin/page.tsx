import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Administration</h1>
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        Manage locations, departments, and user accounts. Managers can add staff
        from the Employees page; full org settings live here.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/admin/locations"
            className="block surface-card p-4 hover:border-sky-300 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Locations</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Venues and job sites
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/departments"
            className="block surface-card p-4 hover:border-sky-300 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Departments</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Teams and default roles
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/users"
            className="block surface-card p-4 hover:border-sky-300 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Users</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Accounts, roles, assignments
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/holidays"
            className="block surface-card p-4 hover:border-sky-300 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Company holidays</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Premium pay and paid time off rules
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/time-off-blackouts"
            className="block surface-card p-4 hover:border-sky-300 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Time off blackouts</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Block employee time-off requests on specific dates
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/payroll-corrections"
            className="block surface-card p-4 hover:border-sky-300 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Payroll corrections</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Fix or add time punches (audit trail)
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/manager"
            className="block surface-card p-4 hover:border-sky-300 dark:hover:border-sky-600"
          >
            <span className="font-medium text-slate-900 dark:text-zinc-100">Scheduling</span>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
              Open manager dashboard
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
