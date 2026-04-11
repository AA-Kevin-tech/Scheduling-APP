"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const SINGLETON_ID = "singleton" as const;

const schema = z.object({
  employeeAccountClockEnabled: z.enum(["true", "false"]),
});

export async function updateOrganizationTimeClockSettings(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = schema.safeParse({
    employeeAccountClockEnabled: formData.get("employeeAccountClockEnabled"),
  });
  if (!parsed.success) {
    return { error: "Invalid selection." };
  }

  const enabled = parsed.data.employeeAccountClockEnabled === "true";

  await prisma.organizationSettings.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      employeeAccountClockEnabled: enabled,
    },
    update: { employeeAccountClockEnabled: enabled },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "OrganizationSettings",
    entityId: SINGLETON_ID,
    action: "UPDATE",
    payload: { employeeAccountClockEnabled: enabled },
  });

  revalidatePath("/admin/time-clock");
  revalidatePath("/employee");
  revalidatePath("/employee/attendance");
  return { ok: true };
}
