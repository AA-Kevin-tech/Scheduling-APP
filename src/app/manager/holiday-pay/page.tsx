import Link from "next/link";
import { requireManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { buildHolidayPayReport } from "@/lib/services/holiday-pay";
import { getDefaultScheduleTimezone } from "@/lib/schedule/tz";
import { firstSearchParam } from "@/lib/search-params";

export default async function ManagerHolidayPayPage({
  searchParams,
}: {
  searchParams: Promise<{ holiday?: string | string[] }>;
}) {
  await requireManager();
  const raw = await searchParams;
  const holidayId = firstSearchParam(raw.holiday);

  const holidays = await prisma.companyHoliday.findMany({
    orderBy: { holidayDateYmd: "desc" },
  });

  const scheduleTz = getDefaultScheduleTimezone();
  const selected =
    holidayId != null
      ? holidays.find((h) => h.id === holidayId) ?? null
      : holidays[0] ?? null;

  const report = selected
    ? await buildHolidayPayReport({
        holiday: selected,
        scheduleTimeZone: scheduleTz,
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Holiday pay</h1>
        <Link
          href="/manager/employees"
          className="text-sm text-sky-700 hover:underline"
        >
          Employees
        </Link>
      </div>

      <p className="text-sm text-slate-600">
        Estimates from <strong>time clock punches</strong> overlapping the holiday
        date in <strong>{scheduleTz}</strong>. Premium = extra hours above straight
        time (multiplier − 1 × hours worked). Paid absence applies to eligible{" "}
        <strong>hourly</strong> staff with no time on that day when configured on
        the holiday. Salary staff typically receive holiday pay in base salary —
        shown for reference only.
      </p>

      {holidays.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          No company holidays configured. An admin can add them under{" "}
          <Link href="/admin/holidays" className="font-medium text-amber-900 underline">
            Admin → Company holidays
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Holiday:</span>
            {holidays.map((h) => (
              <Link
                key={h.id}
                href={`/manager/holiday-pay?holiday=${h.id}`}
                className={`rounded-full border px-3 py-1 text-sm ${
                  selected?.id === h.id
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {h.holidayDateYmd} — {h.name}
              </Link>
            ))}
          </div>

          {selected && report && !report.error ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-center">Eligible</th>
                    <th className="px-3 py-2 text-right">Worked (h)</th>
                    <th className="px-3 py-2 text-right">Premium extra (h)</th>
                    <th className="px-3 py-2 text-right">Paid if off (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr
                      key={r.employeeId}
                      className={
                        r.premiumExtraHours > 0 || (r.paidAbsenceHours ?? 0) > 0
                          ? "bg-emerald-50/50"
                          : ""
                      }
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.email}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {r.compensationType === "HOURLY" ? "Hourly" : "Salary"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.holidayPayEligible ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.workedHoursOnHoliday > 0 ? r.workedHoursOnHoliday : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.premiumExtraHours > 0 ? r.premiumExtraHours : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.paidAbsenceHours != null ? r.paidAbsenceHours : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {selected && report?.error ? (
            <p className="text-sm text-red-600">{report.error}</p>
          ) : null}

          {selected ? (
            <p className="text-xs text-slate-500">
              Holiday: <strong>{selected.name}</strong> · Premium multiplier{" "}
              <strong>{Number(selected.workPremiumMultiplier)}×</strong>
              {selected.paidAbsenceHours != null
                ? ` · Paid absence if not working: ${Number(selected.paidAbsenceHours)} h (hourly eligible only)`
                : " · No automatic paid absence hours configured"}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
