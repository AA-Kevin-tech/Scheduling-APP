"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEmployeeProfile } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/schedule/tz";

const schema = z.object({
  timezone: z.string().min(1),
});

export async function updateEmployeeTimezone(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { employeeId } = await requireEmployeeProfile();
  const parsed = schema.safeParse({
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
