import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Administration</h1>
      <p className="text-sm text-slate-600">
        Manage locations, departments, and user accounts. Managers can add staff
        from the Employees page; full org settings live here.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/admin/locations"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Locations</span>
            <p className="mt-1 text-sm text-slate-600">
              Venues and job sites
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/departments"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Departments</span>
            <p className="mt-1 text-sm text-slate-600">
              Teams and default roles
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/users"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Users</span>
            <p className="mt-1 text-sm text-slate-600">
              Accounts, roles, assignments
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/holidays"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Company holidays</span>
            <p className="mt-1 text-sm text-slate-600">
              Premium pay and paid time off rules
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/payroll-corrections"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Payroll corrections</span>
            <p className="mt-1 text-sm text-slate-600">
              Fix or add time punches (audit trail)
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/manager"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">Scheduling</span>
            <p className="mt-1 text-sm text-slate-600">
              Open manager dashboard
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
