"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { SCHEDULING_EDIT_FEATURE } from "@/lib/permissions/scheduling-edit";

/** Roles that can be restricted from schedule editing (IT/SUPER_ADMIN always may edit). */
const assignableRolesForSchedulingEdit: UserRole[] = [
  "EMPLOYEE",
  "MANAGER",
  "ADMIN",
  "PAYROLL",
];

const updateSchema = z.object({
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN", "PAYROLL"] as const),
  allowed: z.enum(["true", "false"]),
});

export async function updateRoleSchedulingEditPermission(
  formData: FormData,
): Promise<void> {
  const session = await requireSuperAdmin();
  const parsed = updateSchema.safeParse({
    role: formData.get("role"),
    allowed: formData.get("allowed"),
  });
  if (!parsed.success) {
    redirect("/admin/role-permissions?error=invalid");
  }
  const { role, allowed } = parsed.data;
  if (!assignableRolesForSchedulingEdit.includes(role)) {
    redirect("/admin/role-permissions?error=invalid");
  }

  const isAllowed = allowed === "true";

  await prisma.rolePermission.upsert({
    where: {
      role_feature: { role, feature: SCHEDULING_EDIT_FEATURE },
    },
    create: {
      role,
      feature: SCHEDULING_EDIT_FEATURE,
      allowed: isAllowed,
    },
    update: { allowed: isAllowed },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "RolePermission",
    entityId: `${role}:${SCHEDULING_EDIT_FEATURE}`,
    action: "UPDATE",
    payload: { role, feature: SCHEDULING_EDIT_FEATURE, allowed: isAllowed },
  });

  revalidatePath("/admin/role-permissions");
  revalidatePath("/manager/schedule");
  revalidatePath("/manager/swaps");
  redirect("/admin/role-permissions");
}

export async function listRoleSchedulingEditState(): Promise<
  { role: UserRole; allowed: boolean }[]
> {
  await requireSuperAdmin();
  const rows = await prisma.rolePermission.findMany({
    where: { feature: SCHEDULING_EDIT_FEATURE },
    select: { role: true, allowed: true },
  });
  const byRole = new Map(rows.map((r) => [r.role, r.allowed]));
  return assignableRolesForSchedulingEdit.map((role) => ({
    role,
    allowed: byRole.get(role) ?? (role === "EMPLOYEE" ? false : true),
  }));
}
