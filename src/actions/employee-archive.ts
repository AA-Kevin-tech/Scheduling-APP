"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const byUserSchema = z.object({
  userId: z.string().min(1),
  archived: z.enum(["true", "false"]),
});

/** Admin or manager: archive or restore an employee profile (scheduling + employee app). */
export async function setEmployeeArchivedFromUser(
  formData: FormData,
): Promise<void> {
  const session = await requireAdminOrManager();
  const parsed = byUserSchema.safeParse({
    userId: formData.get("userId"),
    archived: formData.get("archived"),
  });
  if (!parsed.success) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, employee: { select: { id: true } } },
  });
  if (!user?.employee) {
    return;
  }

  const employeeId = user.employee.id;
  const archived = parsed.data.archived === "true";
  await prisma.employee.update({
    where: { id: employeeId },
    data: { archivedAt: archived ? new Date() : null },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Employee",
    entityId: employeeId,
    action: archived ? "ARCHIVE" : "RESTORE",
    payload: { userId: user.id },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${user.id}`);
  revalidatePath("/manager/employees");
  revalidatePath(`/manager/employees/${employeeId}`);
  revalidatePath("/manager/schedule");
  revalidatePath("/employee/schedule");
}
