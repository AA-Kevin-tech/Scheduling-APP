"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  holidayDateYmd: z.string().regex(YMD),
  name: z.string().min(1).max(200),
  workPremiumMultiplier: z.coerce.number().min(1).max(10),
  paidAbsenceHours: z.string().optional(),
  notes: z.string().optional(),
});

function parseOptionalHours(raw: string | undefined): Prisma.Decimal | null {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 24 * 14) return null;
  return new Prisma.Decimal(n.toFixed(2));
}

export async function createCompanyHoliday(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse({
    holidayDateYmd: formData.get("holidayDateYmd"),
    name: formData.get("name"),
    workPremiumMultiplier: formData.get("workPremiumMultiplier"),
    paidAbsenceHours: formData.get("paidAbsenceHours") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const paid = parseOptionalHours(parsed.data.paidAbsenceHours);
  if (
    paid === null &&
    (parsed.data.paidAbsenceHours ?? "").trim() !== ""
  ) {
    return { error: "Paid absence hours must be a valid number or blank." };
  }

  const dup = await prisma.companyHoliday.findUnique({
    where: { holidayDateYmd: parsed.data.holidayDateYmd },
  });
  if (dup) return { error: "A holiday already exists on that date." };

  const row = await prisma.companyHoliday.create({
    data: {
      holidayDateYmd: parsed.data.holidayDateYmd,
      name: parsed.data.name.trim(),
      workPremiumMultiplier: new Prisma.Decimal(
        parsed.data.workPremiumMultiplier.toFixed(2),
      ),
      paidAbsenceHours: paid,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "CompanyHoliday",
    entityId: row.id,
    action: "CREATE",
    payload: { holidayDateYmd: row.holidayDateYmd, name: row.name },
  });

  revalidatePath("/admin/holidays");
  revalidatePath("/manager/holiday-pay");
  return { ok: true };
}

const updateSchema = createSchema.extend({
  id: z.string().min(1),
});

export async function updateCompanyHoliday(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    holidayDateYmd: formData.get("holidayDateYmd"),
    name: formData.get("name"),
    workPremiumMultiplier: formData.get("workPremiumMultiplier"),
    paidAbsenceHours: formData.get("paidAbsenceHours") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const paid = parseOptionalHours(parsed.data.paidAbsenceHours);
  if (
    paid === null &&
    (parsed.data.paidAbsenceHours ?? "").trim() !== ""
  ) {
    return { error: "Paid absence hours must be a valid number or blank." };
  }

  const existing = await prisma.companyHoliday.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing) return { error: "Holiday not found." };

  if (parsed.data.holidayDateYmd !== existing.holidayDateYmd) {
    const dup = await prisma.companyHoliday.findUnique({
      where: { holidayDateYmd: parsed.data.holidayDateYmd },
    });
    if (dup) return { error: "A holiday already exists on that date." };
  }

  await prisma.companyHoliday.update({
    where: { id: parsed.data.id },
    data: {
      holidayDateYmd: parsed.data.holidayDateYmd,
      name: parsed.data.name.trim(),
      workPremiumMultiplier: new Prisma.Decimal(
        parsed.data.workPremiumMultiplier.toFixed(2),
      ),
      paidAbsenceHours: paid,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "CompanyHoliday",
    entityId: parsed.data.id,
    action: "UPDATE",
    payload: { holidayDateYmd: parsed.data.holidayDateYmd },
  });

  revalidatePath("/admin/holidays");
  revalidatePath("/manager/holiday-pay");
  return { ok: true };
}

export async function deleteCompanyHoliday(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const row = await prisma.companyHoliday.findUnique({
    where: { id },
    select: { id: true, holidayDateYmd: true },
  });
  if (!row) return { error: "Not found." };

  await prisma.companyHoliday.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "CompanyHoliday",
    entityId: id,
    action: "DELETE",
    payload: { holidayDateYmd: row.holidayDateYmd },
  });

  revalidatePath("/admin/holidays");
  revalidatePath("/manager/holiday-pay");
  return { ok: true };
}
