"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  startsOnYmd: z.string().regex(YMD),
  endsOnYmd: z.string().regex(YMD),
  label: z.string().optional(),
});

function validateYmdOrder(starts: string, ends: string): string | null {
  if (starts > ends) return "End date must be on or after start date.";
  return null;
}

export async function createTimeOffBlackout(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = createSchema.safeParse({
    startsOnYmd: formData.get("startsOnYmd"),
    endsOnYmd: formData.get("endsOnYmd"),
    label: formData.get("label") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const orderErr = validateYmdOrder(
    parsed.data.startsOnYmd,
    parsed.data.endsOnYmd,
  );
  if (orderErr) return { error: orderErr };

  const row = await prisma.timeOffBlackout.create({
    data: {
      startsOnYmd: parsed.data.startsOnYmd,
      endsOnYmd: parsed.data.endsOnYmd,
      label: parsed.data.label?.trim() || null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "TimeOffBlackout",
    entityId: row.id,
    action: "CREATE",
    payload: {
      startsOnYmd: row.startsOnYmd,
      endsOnYmd: row.endsOnYmd,
    },
  });

  revalidatePath("/admin/time-off-blackouts");
  revalidatePath("/employee/time-off");
  return { ok: true };
}

const updateSchema = createSchema.extend({
  id: z.string().min(1),
});

export async function updateTimeOffBlackout(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    startsOnYmd: formData.get("startsOnYmd"),
    endsOnYmd: formData.get("endsOnYmd"),
    label: formData.get("label") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const orderErr = validateYmdOrder(
    parsed.data.startsOnYmd,
    parsed.data.endsOnYmd,
  );
  if (orderErr) return { error: orderErr };

  const existing = await prisma.timeOffBlackout.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing) return { error: "Blackout not found." };

  await prisma.timeOffBlackout.update({
    where: { id: parsed.data.id },
    data: {
      startsOnYmd: parsed.data.startsOnYmd,
      endsOnYmd: parsed.data.endsOnYmd,
      label: parsed.data.label?.trim() || null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "TimeOffBlackout",
    entityId: parsed.data.id,
    action: "UPDATE",
    payload: {
      startsOnYmd: parsed.data.startsOnYmd,
      endsOnYmd: parsed.data.endsOnYmd,
    },
  });

  revalidatePath("/admin/time-off-blackouts");
  revalidatePath("/employee/time-off");
  return { ok: true };
}

export async function deleteTimeOffBlackout(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Missing id." };

  const existing = await prisma.timeOffBlackout.findUnique({ where: { id } });
  if (!existing) return { error: "Already removed." };

  await prisma.timeOffBlackout.delete({ where: { id } });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "TimeOffBlackout",
    entityId: id,
    action: "DELETE",
    payload: {
      startsOnYmd: existing.startsOnYmd,
      endsOnYmd: existing.endsOnYmd,
    },
  });

  revalidatePath("/admin/time-off-blackouts");
  revalidatePath("/employee/time-off");
  return { ok: true };
}
