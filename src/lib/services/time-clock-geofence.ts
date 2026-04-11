import { prisma } from "@/lib/db";

/** Shift venue: explicit shift location, else department's venue. */
export type ShiftForGeofence = {
  locationId: string | null;
  department: { locationId: string };
};

function decimalToNumber(v: unknown): number {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  return Number(v);
}

/** Haversine distance on the WGS84 sphere, result in feet. */
export function haversineDistanceFeet(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  return meters / 0.3048;
}

/**
 * Venue for this punch: shift override, else department site, else employee primary site, else first assigned site.
 */
export async function resolveClockLocationIdForEmployee(
  shift: ShiftForGeofence,
  employeeId: string,
): Promise<string | null> {
  const fromShift = shift.locationId ?? shift.department.locationId;
  if (fromShift) return fromShift;

  const primary = await prisma.employeeLocation.findFirst({
    where: { employeeId, isPrimary: true },
    select: { locationId: true },
  });
  if (primary) return primary.locationId;

  const fallback = await prisma.employeeLocation.findFirst({
    where: { employeeId },
    orderBy: { location: { sortOrder: "asc" } },
    select: { locationId: true },
  });
  return fallback?.locationId ?? null;
}

/**
 * When the location has a complete geofence, require browser coordinates within radius (employee web clock only).
 */
export async function validateEmployeeWebClockGeofence(input: {
  employeeId: string;
  shift: ShiftForGeofence;
  latitude: number | null;
  longitude: number | null;
}): Promise<{ ok: true } | { error: string }> {
  const locationId = await resolveClockLocationIdForEmployee(
    input.shift,
    input.employeeId,
  );
  if (!locationId) {
    return {
      error:
        "No work location could be determined for this shift. Contact a manager.",
    };
  }

  const loc = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      name: true,
      geofenceLatitude: true,
      geofenceLongitude: true,
      geofenceRadiusFeet: true,
    },
  });
  if (!loc) {
    return { error: "Work location not found." };
  }

  const fenceLat = decimalToNumber(loc.geofenceLatitude);
  const fenceLng = decimalToNumber(loc.geofenceLongitude);
  const radiusFeet = decimalToNumber(loc.geofenceRadiusFeet);

  const fenceConfigured =
    Number.isFinite(fenceLat) &&
    Number.isFinite(fenceLng) &&
    Number.isFinite(radiusFeet) &&
    radiusFeet > 0;

  if (!fenceConfigured) {
    return { ok: true };
  }

  const { latitude: clat, longitude: clng } = input;
  if (
    clat == null ||
    clng == null ||
    !Number.isFinite(clat) ||
    !Number.isFinite(clng)
  ) {
    return {
      error:
        "Location access is required to clock in or out from this app for this site. Enable location services and try again, or use the work kiosk.",
    };
  }

  const distFeet = haversineDistanceFeet(fenceLat, fenceLng, clat, clng);
  if (distFeet > radiusFeet) {
    const r = Math.round(radiusFeet);
    return {
      error: `You must be within ${r} feet of ${loc.name} to use the employee clock for this shift.`,
    };
  }

  return { ok: true };
}
