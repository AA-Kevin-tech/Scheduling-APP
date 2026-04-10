"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { validateEmployeePhoneFormValue } from "@/lib/employee-phone-input";
import { normalizeIanaTimezone } from "@/lib/schedule/tz";

const timezoneSchema = z.object({
  timezone: z.string().min(1),
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

export async function updateEmployeePhone(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { employeeId } = await requireEmployeeProfile();
  const raw = String(formData.get("phone") ?? "");
  const checked = validateEmployeePhoneFormValue(raw);
  if (!checked.ok) {
    return { error: checked.error };
  }
  const { phone } = checked;
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
