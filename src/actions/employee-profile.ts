"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/schedule/tz";

const timezoneSchema = z.object({
  timezone: z.string().min(1),
});

const phoneSchema = z.object({
  phone: z.string().max(40),
});

export async function updateEmployeeTimezone(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { employeeId } = await requireEmployeeProfile();
  const parsed = timezoneSchema.safeParse({
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }
  const tz = normalizeIanaTimezone(parsed.data.timezone);
  await prisma.employee.update({
    where: { id: employeeId },
    data: { timezone: tz },
  });
  revalidatePath("/employee/profile");
  revalidatePath("/employee/schedule");
  return { ok: true };
}

function normalizePhone(raw: string): string | null {
  const t = raw.trim();
  if (t === "") return null;
  if (t.length > 40) return null;
  if (!/^[\d\s\-+().]+$/.test(t)) return null;
  return t;
}

export async function updateEmployeePhone(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { employeeId } = await requireEmployeeProfile();
  const parsed = phoneSchema.safeParse({
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { error: "Phone number is too long." };
  }
  const phone = normalizePhone(parsed.data.phone);
  if (phone === null && parsed.data.phone.trim() !== "") {
    return {
      error: "Use digits and common phone symbols only (spaces, dashes, +, parentheses).",
    };
  }
  const row = await prisma.employee.update({
    where: { id: employeeId },
    data: { phone },
    select: { userId: true },
  });
  revalidatePath("/employee/profile");
  revalidatePath(`/manager/employees/${employeeId}`);
  revalidatePath(`/admin/users/${row.userId}`);
  return { ok: true };
}
