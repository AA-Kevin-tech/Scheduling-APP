"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sessionMayAccessVenue } from "@/lib/auth/location-scope";
import { requireManager } from "@/lib/auth/guards";
import { getSchedulingEditAllowedForSession } from "@/lib/permissions/scheduling-edit";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

const baseSchema = z.object({
  locationId: z.string().min(1),
  startsOnYmd: z.string().regex(YMD),
  endsOnYmd: z.string().regex(YMD),
  title: z.string().trim().min(1).max(200),
  message: z.string().optional(),
  highlightHex: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : "")),
  showAnnouncement: z.boolean(),
  businessClosed: z.boolean(),
  blockTimeOffRequests: z.boolean(),
});

function validateYmdOrder(starts: string, ends: string): string | null {
  if (starts > ends) return "End date must be on or after start date.";
  return null;
}

function normalizeHex(raw: string): string | null {
  if (!raw) return null;
  return HEX.test(raw) ? raw : null;
}

function parseTypes(formData: FormData) {
  return {
    showAnnouncement: formData.get("showAnnouncement") === "on",
    businessClosed: formData.get("businessClosed") === "on",
    blockTimeOffRequests: formData.get("blockTimeOffRequests") === "on",
  };
}

export async function createScheduleAnnotation(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  if (!(await getSchedulingEditAllowedForSession(session))) {
    return { error: "Schedule is view-only for your role." };
  }
  const types = parseTypes(formData);
  const parsed = baseSchema.safeParse({
    locationId: formData.get("locationId"),
    startsOnYmd: formData.get("startsOnYmd"),
    endsOnYmd: formData.get("endsOnYmd"),
    title: formData.get("title"),
    message: formData.get("message") ?? undefined,
    highlightHex: formData.get("highlightHex") ?? undefined,
    ...types,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }
  if (
    !parsed.data.showAnnouncement &&
    !parsed.data.businessClosed &&
    !parsed.data.blockTimeOffRequests
  ) {
    return {
      error: "Choose at least one: announcement, business closed, or no time off requests.",
    };
  }
  const orderErr = validateYmdOrder(
    parsed.data.startsOnYmd,
    parsed.data.endsOnYmd,
  );
  if (orderErr) return { error: orderErr };

  const hex = normalizeHex(parsed.data.highlightHex);
  if (parsed.data.highlightHex && !hex) {
    return { error: "Highlight color must be a #RRGGBB value or left default." };
  }

  if (!(await sessionMayAccessVenue(session, parsed.data.locationId))) {
    return { error: "You cannot add annotations for that location." };
  }

  const row = await prisma.scheduleAnnotation.create({
    data: {
      locationId: parsed.data.locationId,
      startsOnYmd: parsed.data.startsOnYmd,
      endsOnYmd: parsed.data.endsOnYmd,
      title: parsed.data.title,
      message: parsed.data.message?.trim() || null,
      highlightHex: hex,
      showAnnouncement: parsed.data.showAnnouncement,
      businessClosed: parsed.data.businessClosed,
      blockTimeOffRequests: parsed.data.blockTimeOffRequests,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "ScheduleAnnotation",
    entityId: row.id,
    action: "CREATE",
    payload: {
      locationId: row.locationId,
      startsOnYmd: row.startsOnYmd,
      endsOnYmd: row.endsOnYmd,
      title: row.title,
    },
  });

  revalidatePaths();
  return { ok: true };
}

const updateSchema = baseSchema.extend({
  id: z.string().min(1),
});

export async function updateScheduleAnnotation(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  if (!(await getSchedulingEditAllowedForSession(session))) {
    return { error: "Schedule is view-only for your role." };
  }
  const types = parseTypes(formData);
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    locationId: formData.get("locationId"),
    startsOnYmd: formData.get("startsOnYmd"),
    endsOnYmd: formData.get("endsOnYmd"),
    title: formData.get("title"),
    message: formData.get("message") ?? undefined,
    highlightHex: formData.get("highlightHex") ?? undefined,
    ...types,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }
  if (
    !parsed.data.showAnnouncement &&
    !parsed.data.businessClosed &&
    !parsed.data.blockTimeOffRequests
  ) {
    return {
      error: "Choose at least one: announcement, business closed, or no time off requests.",
    };
  }
  const orderErr = validateYmdOrder(
    parsed.data.startsOnYmd,
    parsed.data.endsOnYmd,
  );
  if (orderErr) return { error: orderErr };

  const hex = normalizeHex(parsed.data.highlightHex);
  if (parsed.data.highlightHex && !hex) {
    return { error: "Highlight color must be a #RRGGBB value or left default." };
  }

  const existing = await prisma.scheduleAnnotation.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing) return { error: "Annotation not found." };
  if (!(await sessionMayAccessVenue(session, existing.locationId))) {
    return { error: "Not allowed." };
  }
  if (!(await sessionMayAccessVenue(session, parsed.data.locationId))) {
    return { error: "You cannot move this annotation to that location." };
  }

  await prisma.scheduleAnnotation.update({
    where: { id: parsed.data.id },
    data: {
      locationId: parsed.data.locationId,
      startsOnYmd: parsed.data.startsOnYmd,
      endsOnYmd: parsed.data.endsOnYmd,
      title: parsed.data.title,
      message: parsed.data.message?.trim() || null,
      highlightHex: hex,
      showAnnouncement: parsed.data.showAnnouncement,
      businessClosed: parsed.data.businessClosed,
      blockTimeOffRequests: parsed.data.blockTimeOffRequests,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "ScheduleAnnotation",
    entityId: parsed.data.id,
    action: "UPDATE",
    payload: {
      locationId: parsed.data.locationId,
      startsOnYmd: parsed.data.startsOnYmd,
      endsOnYmd: parsed.data.endsOnYmd,
    },
  });

  revalidatePaths();
  return { ok: true };
}

/** Create or update based on hidden `id` field (manager day-note dialog). */
export async function saveScheduleAnnotation(
  prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const id = formData.get("id");
  if (typeof id === "string" && id.trim()) {
    return updateScheduleAnnotation(prev, formData);
  }
  return createScheduleAnnotation(prev, formData);
}

export async function deleteScheduleAnnotation(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireManager();
  if (!(await getSchedulingEditAllowedForSession(session))) {
    return { error: "Schedule is view-only for your role." };
  }
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const existing = await prisma.scheduleAnnotation.findUnique({
    where: { id },
  });
  if (!existing) return { error: "Annotation not found." };
  if (!(await sessionMayAccessVenue(session, existing.locationId))) {
    return { error: "Not allowed." };
  }

  await prisma.scheduleAnnotation.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "ScheduleAnnotation",
    entityId: id,
    action: "DELETE",
    payload: { title: existing.title },
  });

  revalidatePaths();
  return { ok: true };
}

function revalidatePaths() {
  revalidatePath("/manager/schedule");
  revalidatePath("/employee/schedule");
  revalidatePath("/employee");
  revalidatePath("/employee/time-off");
  revalidatePath("/manager");
}
