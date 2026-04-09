"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { timeClockPinLookupDigest } from "@/lib/time-clock/pin-lookup";

const schema = z.object({
  employeeId: z.string().min(1),
  pin: z.string().optional(),
  pinConfirm: z.string().optional(),
  adminUserIdForRevalidate: z.string().optional(),
});

const PIN_REGEX = /^\d{4,8}$/;

async function pinIsUniqueForOthers(
  plainPin: string,
  excludeEmployeeId: string,
): Promise<boolean> {
  let digest: string;
  try {
    digest = timeClockPinLookupDigest(plainPin);
  } catch {
    return false;
  }
  const clash = await prisma.employee.findFirst({
    where: {
      id: { not: excludeEmployeeId },
      timeClockPinLookup: digest,
    },
    select: { id: true },
  });
  if (clash) return false;

  const legacy = await prisma.employee.findMany({
    where: {
      id: { not: excludeEmployeeId },
      timeClockPinHash: { not: null },
      timeClockPinLookup: null,
    },
    select: { timeClockPinHash: true },
  });
  for (const r of legacy) {
    if (r.timeClockPinHash && (await compare(plainPin, r.timeClockPinHash))) {
      return false;
    }
  }
  return true;
}

export async function updateEmployeeTimeClockPin(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdminOrManager();

  const parsed = schema.safeParse({
    employeeId: formData.get("employeeId"),
    pin: formData.get("pin") ?? undefined,
    pinConfirm: formData.get("pinConfirm") ?? undefined,
    adminUserIdForRevalidate: formData.get("adminUserIdForRevalidate") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid form." };
  }

  const { employeeId, pin, pinConfirm, adminUserIdForRevalidate } = parsed.data;
  const p = (pin ?? "").trim();
  const c = (pinConfirm ?? "").trim();

  if (p === "" && c === "") {
    return { error: "Enter a new PIN or use Remove PIN." };
  }

  if (p !== c) {
    return { error: "PIN and confirmation do not match." };
  }

  if (!PIN_REGEX.test(p)) {
    return { error: "PIN must be 4–8 digits." };
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, userId: true },
  });
  if (!emp) {
    return { error: "Employee not found." };
  }

  if (!(await pinIsUniqueForOthers(p, employeeId))) {
    return { error: "That PIN is already assigned to another employee." };
  }

  const timeClockPinHash = await hash(p, 12);
  let timeClockPinLookup: string;
  try {
    timeClockPinLookup = timeClockPinLookupDigest(p);
  } catch {
    return { error: "Server configuration error (AUTH_SECRET)." };
  }
  await prisma.employee.update({
    where: { id: employeeId },
    data: { timeClockPinHash, timeClockPinLookup },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Employee",
    entityId: employeeId,
    action: "SET_TIME_CLOCK_PIN",
    payload: {},
  });

  revalidatePath("/manager/employees");
  revalidatePath(`/manager/employees/${employeeId}`);
  revalidatePath("/admin/users");
  if (adminUserIdForRevalidate) {
    revalidatePath(`/admin/users/${adminUserIdForRevalidate}`);
  }

  return { ok: true };
}

export async function clearEmployeeTimeClockPin(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdminOrManager();

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const adminUserIdForRevalidate = String(
    formData.get("adminUserIdForRevalidate") ?? "",
  ).trim();

  if (!employeeId) {
    return { error: "Invalid form." };
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!emp) {
    return { error: "Employee not found." };
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { timeClockPinHash: null, timeClockPinLookup: null },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Employee",
    entityId: employeeId,
    action: "CLEAR_TIME_CLOCK_PIN",
    payload: {},
  });

  revalidatePath("/manager/employees");
  revalidatePath(`/manager/employees/${employeeId}`);
  revalidatePath("/admin/users");
  if (adminUserIdForRevalidate) {
    revalidatePath(`/admin/users/${adminUserIdForRevalidate}`);
  }

  return { ok: true };
}
