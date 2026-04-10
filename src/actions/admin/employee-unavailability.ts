"use server";

import type { Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { employeeOverlapsSchedulingScope } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const slotSchema = z.object({
  employeeId: z.string().min(1),
  adminUserIdForRevalidate: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startsAt: z.string().regex(/^\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{2}:\d{2}$/),
});

const updateSchema = slotSchema.extend({
  id: z.string().min(1),
});

async function assertAdminCanEditEmployee(
  session: Session,
  employeeId: string,
): Promise<boolean> {
  return employeeOverlapsSchedulingScope(session, employeeId);
}

export async function adminCreateUnavailabilitySlot(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const parsed = slotSchema.safeParse({
    employeeId: formData.get("employeeId"),
    adminUserIdForRevalidate: formData.get("adminUserIdForRevalidate"),
    dayOfWeek: formData.get("dayOfWeek"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });

  if (!parsed.success) {
    return { error: "Invalid fields." };
  }

  const { employeeId, adminUserIdForRevalidate, dayOfWeek, startsAt, endsAt } =
    parsed.data;

  if (!(await assertAdminCanEditEmployee(session, employeeId))) {
    return { error: "You cannot edit this employee." };
  }

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
    payload: { byAdmin: true, dayOfWeek, startsAt, endsAt },
  });

  revalidatePath(`/admin/users/${adminUserIdForRevalidate}`);
  revalidatePath("/employee/availability");
  return {};
}

export async function adminUpdateUnavailabilitySlot(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    employeeId: formData.get("employeeId"),
    adminUserIdForRevalidate: formData.get("adminUserIdForRevalidate"),
    dayOfWeek: formData.get("dayOfWeek"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });

  if (!parsed.success) {
    return { error: "Invalid fields." };
  }

  const {
    id,
    employeeId,
    adminUserIdForRevalidate,
    dayOfWeek,
    startsAt,
    endsAt,
  } = parsed.data;

  if (!(await assertAdminCanEditEmployee(session, employeeId))) {
    return { error: "You cannot edit this employee." };
  }

  if (startsAt >= endsAt) {
    return { error: "End time must be after start time." };
  }

  const row = await prisma.availability.findFirst({
    where: { id, employeeId },
  });
  if (!row) {
    return { error: "Block not found." };
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
    payload: { byAdmin: true, dayOfWeek, startsAt, endsAt },
  });

  revalidatePath(`/admin/users/${adminUserIdForRevalidate}`);
  revalidatePath("/employee/availability");
  return {};
}

export async function adminDeleteUnavailabilitySlot(
  formData: FormData,
): Promise<void> {
  const session = await requireAdmin();

  const idRaw = formData.get("id");
  const employeeIdRaw = formData.get("employeeId");
  const adminUserIdRaw = formData.get("adminUserIdForRevalidate");

  if (
    typeof idRaw !== "string" ||
    !idRaw ||
    typeof employeeIdRaw !== "string" ||
    !employeeIdRaw ||
    typeof adminUserIdRaw !== "string" ||
    !adminUserIdRaw
  ) {
    return;
  }

  if (!(await assertAdminCanEditEmployee(session, employeeIdRaw))) {
    return;
  }

  const row = await prisma.availability.findFirst({
    where: { id: idRaw, employeeId: employeeIdRaw },
  });
  if (!row) return;

  await prisma.availability.delete({ where: { id: idRaw } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Availability",
    entityId: idRaw,
    action: "DELETE",
    payload: { byAdmin: true },
  });

  revalidatePath(`/admin/users/${adminUserIdRaw}`);
  revalidatePath("/employee/availability");
}
