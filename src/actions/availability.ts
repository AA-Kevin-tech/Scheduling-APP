"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const slotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startsAt: z.string().regex(/^\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function createAvailabilitySlot(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const { session, employeeId } = await requireEmployeeProfile();

  const parsed = slotSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });

  if (!parsed.success) {
    return { error: "Invalid availability fields." };
  }

  const { dayOfWeek, startsAt, endsAt } = parsed.data;
  if (startsAt >= endsAt) {
    return { error: "End time must be after start time." };
  }

  await prisma.availability.create({
    data: {
      employeeId,
      dayOfWeek,
      startsAt,
      endsAt,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Availability",
    entityId: employeeId,
    action: "CREATE",
    payload: { dayOfWeek, startsAt, endsAt },
  });

  revalidatePath("/employee/availability");
  return {};
}

const updateSchema = slotSchema.extend({
  id: z.string().min(1),
});

export async function updateAvailabilitySlot(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const { session, employeeId } = await requireEmployeeProfile();

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    dayOfWeek: formData.get("dayOfWeek"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });

  if (!parsed.success) {
    return { error: "Invalid availability fields." };
  }

  const { id, dayOfWeek, startsAt, endsAt } = parsed.data;
  if (startsAt >= endsAt) {
    return { error: "End time must be after start time." };
  }

  const row = await prisma.availability.findFirst({
    where: { id, employeeId },
  });
  if (!row) {
    return { error: "Slot not found." };
  }

  await prisma.availability.update({
    where: { id },
    data: { dayOfWeek, startsAt, endsAt },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Availability",
    entityId: id,
    action: "UPDATE",
    payload: { dayOfWeek, startsAt, endsAt },
  });

  revalidatePath("/employee/availability");
  return {};
}

export async function deleteAvailabilitySlot(formData: FormData): Promise<void> {
  const { session, employeeId } = await requireEmployeeProfile();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const row = await prisma.availability.findFirst({
    where: { id, employeeId },
  });
  if (!row) return;

  await prisma.availability.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Availability",
    entityId: id,
    action: "DELETE",
  });

  revalidatePath("/employee/availability");
}
