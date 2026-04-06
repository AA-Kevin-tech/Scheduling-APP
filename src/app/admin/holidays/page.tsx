import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import {
  AddCompanyHolidayForm,
  EditCompanyHolidayForm,
} from "@/components/admin/company-holiday-forms";
import { getDefaultScheduleTimezone } from "@/lib/schedule/tz";
import { prisma } from "@/lib/db";

export default async function AdminCompanyHolidaysPage() {
  await requireAdmin();
  const [holidays, scheduleTz] = await Promise.all([
    prisma.companyHoliday.findMany({
      orderBy: { holidayDateYmd: "asc" },
    }),
    Promise.resolve(getDefaultScheduleTimezone()),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Company holidays</h1>
        <Link href="/admin" className="text-sm text-sky-700 hover:underline">
          ← Admin
        </Link>
      </div>
      <p className="text-sm text-slate-600">
        Each date uses the org schedule timezone ({scheduleTz}) for full-day
        boundaries. Set a <strong>work premium multiplier</strong> (e.g. 1.5 for
        time-and-a-half on hours worked that day) and optional{" "}
        <strong>paid absence hours</strong> for eligible hourly staff who did not
        clock in (see manager Holiday pay report).
      </p>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-800">Configured holidays</h2>
        {holidays.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">None yet — add one below.</p>
        ) : (
          <ul className="mt-4 space-y-6 divide-y divide-slate-100">
            {holidays.map((h) => (
              <li key={h.id} className="pt-4 first:pt-0">
                <EditCompanyHolidayForm h={h} />
              </li>
            ))}
          </ul>
        )}
        <AddCompanyHolidayForm />
      </section>
    </div>
  );
}
