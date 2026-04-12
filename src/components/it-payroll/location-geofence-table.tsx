import { LocationGeofenceRow } from "@/components/it-payroll/location-geofence-row";

export function LocationGeofenceTable({
  locations,
}: {
  locations: Array<{
    id: string;
    name: string;
    geofenceLatitude: unknown;
    geofenceLongitude: unknown;
    geofenceRadiusFeet: unknown;
  }>;
}) {
  if (locations.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-zinc-400">No locations configured yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="table-head-row">
          <tr>
            <th className="py-2 pr-4 font-medium">Location</th>
            <th className="py-2 pr-4 font-medium">Latitude</th>
            <th className="py-2 pr-4 font-medium">Longitude</th>
            <th className="py-2 pr-4 font-medium">Radius (ft)</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => (
            <tr key={loc.id} className="table-row-divider align-top">
              <td className="py-3 pr-4 font-medium text-slate-900 dark:text-zinc-100">{loc.name}</td>
              <td className="py-3 pr-4" colSpan={4}>
                <LocationGeofenceRow loc={loc} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
