import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { getDefaultScheduleTimezone } from "@/lib/schedule/tz";
import { prisma } from "@/lib/db";
import {
  AddTimeOffBlackoutForm,
  EditTimeOffBlackoutForm,
} from "@/components/admin/time-off-blackout-forms";

export default async function AdminTimeOffBlackoutsPage() {
  await requireAdmin();
  const [rows, scheduleTz] = await Promise.all([
    prisma.timeOffBlackout.findMany({
      orderBy: [{ startsOnYmd: "asc" }, { endsOnYmd: "asc" }],
    }),
    Promise.resolve(getDefaultScheduleTimezone()),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">
          Time off blackouts
        </h1>
        <Link href="/admin" className="text-sm text-sky-700 hover:underline">
          ← Admin
        </Link>
      </div>
      <p className="text-sm text-slate-600 dark:text-zinc-400">
        Employees cannot submit new time off requests that touch these dates
        (inclusive ranges). Dates use the org schedule timezone ({scheduleTz}),
        same as company holidays. Existing pending or approved requests are not
        changed automatically.
      </p>

      <section className="surface-card p-6">
        <h2 className="text-sm font-medium text-slate-800 dark:text-zinc-200">
          Configured blackouts
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-zinc-500">None yet — add one below.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id}>
                <EditTimeOffBlackoutForm row={row} />
              </li>
            ))}
          </ul>
        )}
        <AddTimeOffBlackoutForm />
      </section>
    </div>
  );
}
