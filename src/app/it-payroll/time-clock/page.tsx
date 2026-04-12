import Link from "next/link";
import { ItPayrollTimeClockSettingsForm } from "@/components/it-payroll/it-payroll-time-clock-settings-form";
import { LocationGeofenceTable } from "@/components/it-payroll/location-geofence-table";
import { requireItOrPayroll } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

const SINGLETON_ID = "singleton" as const;

export default async function ItPayrollTimeClockPage() {
  await requireItOrPayroll();

  const [row, locations] = await Promise.all([
    prisma.organizationSettings.findUnique({
      where: { id: SINGLETON_ID },
      select: { employeeAccountClockEnabled: true },
    }),
    prisma.location.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        geofenceLatitude: true,
        geofenceLongitude: true,
        geofenceRadiusFeet: true,
      },
    }),
  ]);
  const employeeAccountClockEnabled = row?.employeeAccountClockEnabled ?? false;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/it-payroll"
          className="text-sm text-sky-700 hover:underline"
        >
          ← IT / Payroll
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Time clock & geofence
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Only IT and Payroll can change these settings. Configure whether
          employees may clock from their signed-in account, and optional
          per-location geofences (center latitude/longitude, radius in feet) for
          that flow. The work kiosk is not restricted by geofence.
        </p>
      </div>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-900">
          Employee account clocking
        </h2>
        <div className="mt-3">
          <ItPayrollTimeClockSettingsForm
            employeeAccountClockEnabled={employeeAccountClockEnabled}
          />
        </div>
      </section>

      <section className="surface-card p-4">
        <h2 className="text-sm font-medium text-slate-900">
          Per-location geofences
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          When all three values are set for a location, employee-account clock
          in/out for shifts at that site requires the device location to be
          within the radius. Uses the shift&apos;s location (or department
          venue), with fallback to the employee&apos;s primary site if needed.
          Clear all three fields and save to disable.
        </p>
        <div className="mt-4">
          <LocationGeofenceTable locations={locations} />
        </div>
      </section>
    </div>
  );
}
