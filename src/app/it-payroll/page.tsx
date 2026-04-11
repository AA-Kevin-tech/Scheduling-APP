import Link from "next/link";
import { requireItOrPayroll } from "@/lib/auth/guards";

export default async function ItPayrollHomePage() {
  await requireItOrPayroll();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">IT / Payroll</h1>
      <p className="text-sm text-slate-600">
        Tools for organization time clock policy and location-based checks for
        employee-account clocking.
      </p>
      <ul className="grid gap-3">
        <li>
          <Link
            href="/it-payroll/time-clock"
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300"
          >
            <span className="font-medium text-slate-900">
              Time clock & geofence
            </span>
            <p className="mt-1 text-sm text-slate-600">
              Kiosk vs employee account clocking; per-location geofences (feet)
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
