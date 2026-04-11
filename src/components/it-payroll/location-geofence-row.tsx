"use client";

import { useFormState } from "react-dom";
import { updateLocationGeofence } from "@/actions/it-payroll/location-geofence";

function decToInput(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function LocationGeofenceRow({
  loc,
}: {
  loc: {
    id: string;
    name: string;
    geofenceLatitude: unknown;
    geofenceLongitude: unknown;
    geofenceRadiusFeet: unknown;
  };
}) {
  const [state, action] = useFormState(updateLocationGeofence, {});

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="locationId" value={loc.id} />
        <label className="sr-only" htmlFor={`lat-${loc.id}`}>
          Latitude
        </label>
        <input
          id={`lat-${loc.id}`}
          name="geofenceLatitude"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 29.76"
          defaultValue={decToInput(loc.geofenceLatitude)}
          className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
        />
        <label className="sr-only" htmlFor={`lng-${loc.id}`}>
          Longitude
        </label>
        <input
          id={`lng-${loc.id}`}
          name="geofenceLongitude"
          type="text"
          inputMode="decimal"
          placeholder="-95.37"
          defaultValue={decToInput(loc.geofenceLongitude)}
          className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
        />
        <label className="sr-only" htmlFor={`r-${loc.id}`}>
          Radius feet
        </label>
        <input
          id={`r-${loc.id}`}
          name="geofenceRadiusFeet"
          type="text"
          inputMode="decimal"
          placeholder="500"
          defaultValue={decToInput(loc.geofenceRadiusFeet)}
          className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
        >
          Save
        </button>
      </form>
      {state.error ? (
        <p className="mt-1 text-xs text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="mt-1 text-xs text-emerald-800">Saved.</p>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">
        Leave all three empty and save to clear the geofence for this location.
      </p>
    </div>
  );
}
