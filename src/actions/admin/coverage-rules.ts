"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

function parseOptionalDate(
  raw: FormDataEntryValue | null,
  endOfDay: boolean,
): Date | null {
  if (raw === null || raw === "") return null;
  const s = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  if (endOfDay) {
    return new Date(`${s}T23:59:59.999Z`);
  }
  return new Date(`${s}T00:00:00.000Z`);
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}

const createSchema = z.object({
  departmentId: z.string().min(1),
  minStaffCount: z.coerce.number().int().min(1).max(999),
  zoneId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function createCoverageRule(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const zoneRaw = emptyToNull(formData.get("zoneId"));
  const parsed = createSchema.safeParse({
    departmentId: formData.get("departmentId"),
    minStaffCount: formData.get("minStaffCount"),
    zoneId: zoneRaw,
    note: emptyToNull(formData.get("note")),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const validFrom = parseOptionalDate(formData.get("validFrom"), false);
  const validTo = parseOptionalDate(formData.get("validTo"), true);
  if (validFrom && validTo && validTo < validFrom) {
    return { error: "Valid to must be on or after valid from." };
  }

  const dept = await prisma.department.findUnique({
    where: { id: parsed.data.departmentId },
    select: { id: true },
  });
  if (!dept) return { error: "Department not found." };

  const requestedZoneId = parsed.data.zoneId ?? null;
  if (requestedZoneId) {
    const zRow = await prisma.departmentZone.findFirst({
      where: { id: requestedZoneId, departmentId: parsed.data.departmentId },
      select: { id: true },
    });
    if (!zRow) return { error: "Zone does not belong to this department." };
  }

  const rule = await prisma.coverageRule.create({
    data: {
      departmentId: parsed.data.departmentId,
      zoneId: requestedZoneId,
      minStaffCount: parsed.data.minStaffCount,
      validFrom,
      validTo,
      note: parsed.data.note?.trim() || null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "CoverageRule",
    entityId: rule.id,
    action: "CREATE",
    payload: {
      departmentId: rule.departmentId,
      minStaffCount: rule.minStaffCount,
      zoneId: rule.zoneId,
    },
  });

  revalidatePaths();
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  departmentId: z.string().min(1),
  minStaffCount: z.coerce.number().int().min(1).max(999),
  zoneId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function updateCoverageRule(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const zoneRaw = emptyToNull(formData.get("zoneId"));
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    departmentId: formData.get("departmentId"),
    minStaffCount: formData.get("minStaffCount"),
    zoneId: zoneRaw,
    note: emptyToNull(formData.get("note")),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const validFrom = parseOptionalDate(formData.get("validFrom"), false);
  const validTo = parseOptionalDate(formData.get("validTo"), true);
  if (validFrom && validTo && validTo < validFrom) {
    return { error: "Valid to must be on or after valid from." };
  }

  const existing = await prisma.coverageRule.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, departmentId: true },
  });
  if (!existing || existing.departmentId !== parsed.data.departmentId) {
    return { error: "Rule not found." };
  }

  const requestedZoneId = parsed.data.zoneId ?? null;
  if (requestedZoneId) {
    const zRow = await prisma.departmentZone.findFirst({
      where: { id: requestedZoneId, departmentId: parsed.data.departmentId },
      select: { id: true },
    });
    if (!zRow) return { error: "Zone does not belong to this department." };
  }

  await prisma.coverageRule.update({
    where: { id: parsed.data.id },
    data: {
      zoneId: requestedZoneId,
      minStaffCount: parsed.data.minStaffCount,
      validFrom,
      validTo,
      note: parsed.data.note?.trim() || null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "CoverageRule",
    entityId: parsed.data.id,
    action: "UPDATE",
    payload: { minStaffCount: parsed.data.minStaffCount, zoneId: requestedZoneId },
  });

  revalidatePaths();
  return { ok: true };
}

export async function deleteCoverageRule(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const row = await prisma.coverageRule.findUnique({
    where: { id },
    select: { id: true, departmentId: true },
  });
  if (!row) return { error: "Rule not found." };

  await prisma.coverageRule.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "CoverageRule",
    entityId: id,
    action: "DELETE",
    payload: { departmentId: row.departmentId },
  });

  revalidatePaths();
  return { ok: true };
}

function revalidatePaths() {
  revalidatePath("/admin/departments");
  revalidatePath("/manager/coverage");
  revalidatePath("/manager");
}
