"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { employeeOverlapsSchedulingScope } from "@/lib/auth/location-scope";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { canAccessAdminRoutes } from "@/lib/auth/roles";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validateEmployeePhoneFormValue } from "@/lib/employee-phone-input";
import { writeAuditLog } from "@/lib/services/audit";

const schema = z.object({
  employeeId: z.string().min(1),
  adminUserIdForRevalidate: z.string().optional(),
});

export async function updateEmployeePhoneByStaff(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdminOrManager();
  const parsed = schema.safeParse({
    employeeId: formData.get("employeeId"),
    adminUserIdForRevalidate: formData.get("adminUserIdForRevalidate") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Invalid form." };
  }

  const { employeeId, adminUserIdForRevalidate } = parsed.data;
  const isAdmin = canAccessAdminRoutes(session.user.role as UserRole);

  if (!isAdmin) {
    const allowed = await employeeOverlapsSchedulingScope(session, employeeId);
    if (!allowed) {
      return { error: "You do not have access to this employee." };
    }
  }

  const raw = String(formData.get("phone") ?? "");
  const checked = validateEmployeePhoneFormValue(raw);
  if (!checked.ok) {
    return { error: checked.error };
  }

  const row = await prisma.employee.update({
    where: { id: employeeId },
    data: { phone: checked.phone },
    select: { userId: true },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Employee",
    entityId: employeeId,
    action: "SET_EMPLOYEE_PHONE_STAFF",
    payload: {},
  });

  revalidatePath("/employee/profile");
  revalidatePath(`/manager/employees/${employeeId}`);
  revalidatePath("/manager/employees");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${row.userId}`);
  if (adminUserIdForRevalidate) {
    revalidatePath(`/admin/users/${adminUserIdForRevalidate}`);
  }

  return { ok: true };
}
