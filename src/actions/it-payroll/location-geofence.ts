"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireItOrPayroll } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const schema = z.object({
  locationId: z.string().min(1),
  geofenceLatitude: z.string().optional(),
  geofenceLongitude: z.string().optional(),
  geofenceRadiusFeet: z.string().optional(),
});

function emptyToNull(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  return t === "" ? null : t;
}

export async function updateLocationGeofence(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await requireItOrPayroll();
  const parsed = schema.safeParse({
    locationId: formData.get("locationId"),
    geofenceLatitude: formData.get("geofenceLatitude") ?? undefined,
    geofenceLongitude: formData.get("geofenceLongitude") ?? undefined,
    geofenceRadiusFeet: formData.get("geofenceRadiusFeet") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Invalid form." };
  }

  const latRaw = emptyToNull(parsed.data.geofenceLatitude);
  const lngRaw = emptyToNull(parsed.data.geofenceLongitude);
  const rRaw = emptyToNull(parsed.data.geofenceRadiusFeet);

  const allEmpty = latRaw == null && lngRaw == null && rRaw == null;
  if (allEmpty) {
    await prisma.location.update({
      where: { id: parsed.data.locationId },
      data: {
        geofenceLatitude: null,
        geofenceLongitude: null,
        geofenceRadiusFeet: null,
      },
    });
    await writeAuditLog({
      actorUserId: session.user.id,
      entityType: "Location",
      entityId: parsed.data.locationId,
      action: "UPDATE_GEOFENCE",
      payload: { cleared: true },
    });
    revalidatePath("/it-payroll/time-clock");
    revalidatePath("/employee");
    return { ok: true };
  }

  if (latRaw == null || lngRaw == null || rRaw == null) {
    return {
      error:
        "Set all three fields (latitude, longitude, radius in feet) or clear all to disable the geofence.",
    };
  }

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const rFeet = Number(rRaw);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: "Latitude must be between -90 and 90." };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Longitude must be between -180 and 180." };
  }
  if (!Number.isFinite(rFeet) || rFeet <= 0 || rFeet > 528_000) {
    return {
      error:
        "Radius must be a positive number of feet (max 528000, about 100 miles).",
    };
  }

  await prisma.location.update({
    where: { id: parsed.data.locationId },
    data: {
      geofenceLatitude: lat,
      geofenceLongitude: lng,
      geofenceRadiusFeet: rFeet,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Location",
    entityId: parsed.data.locationId,
    action: "UPDATE_GEOFENCE",
    payload: {
      geofenceLatitude: lat,
      geofenceLongitude: lng,
      geofenceRadiusFeet: rFeet,
    },
  });

  revalidatePath("/it-payroll/time-clock");
  revalidatePath("/employee");
  return { ok: true };
}
