"use server";

import { revalidatePath } from "next/cache";
import { HourLimitScope } from "@prisma/client";
import { z } from "zod";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const schema = z.object({
  employeeId: z.string().min(1),
  weeklyMaxHours: z.string().optional(),
  dailyMaxHours: z.string().optional(),
  adminUserIdForRevalidate: z.string().optional(),
});

function parseHours(raw: string | undefined): number | null {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

export async function updateEmployeeHourLimits(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdminOrManager();

  const parsed = schema.safeParse({
    employeeId: formData.get("employeeId"),
    weeklyMaxHours: formData.get("weeklyMaxHours") ?? undefined,
    dailyMaxHours: formData.get("dailyMaxHours") ?? undefined,
    adminUserIdForRevalidate: formData.get("adminUserIdForRevalidate") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid form." };
  }

  const emp = await prisma.employee.findUnique({
    where: { id: parsed.data.employeeId },
    select: { id: true },
  });
  if (!emp) {
    return { error: "Employee not found." };
  }

  const weeklyH = parseHours(parsed.data.weeklyMaxHours);
  const dailyH = parseHours(parsed.data.dailyMaxHours);

  if (weeklyH !== null && (weeklyH < 0.5 || weeklyH > 168)) {
    return { error: "Weekly cap must be between 0.5 and 168 hours, or left blank." };
  }
  if (dailyH !== null && (dailyH < 0.5 || dailyH > 24)) {
    return { error: "Daily cap must be between 0.5 and 24 hours, or left blank." };
  }

  if (weeklyH === null && dailyH === null) {
    await prisma.$transaction(async (tx) => {
      await tx.hourLimit.deleteMany({
        where: {
          scope: HourLimitScope.EMPLOYEE,
          employeeId: parsed.data.employeeId,
        },
      });
    });
  } else {
    const weeklyMaxMinutes =
      weeklyH !== null ? Math.round(weeklyH * 60) : null;
    const dailyMaxMinutes =
      dailyH !== null ? Math.round(dailyH * 60) : null;

    await prisma.$transaction(async (tx) => {
      await tx.hourLimit.deleteMany({
        where: {
          scope: HourLimitScope.EMPLOYEE,
          employeeId: parsed.data.employeeId,
        },
      });
      await tx.hourLimit.create({
        data: {
          scope: HourLimitScope.EMPLOYEE,
          employeeId: parsed.data.employeeId,
          weeklyMaxMinutes,
          dailyMaxMinutes,
        },
      });
    });
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Employee",
    entityId: parsed.data.employeeId,
    action: "UPDATE_HOUR_LIMITS",
    payload: {
      weeklyMaxHours: weeklyH,
      dailyMaxHours: dailyH,
    },
  });

  revalidatePath("/manager/employees");
  revalidatePath(`/manager/employees/${parsed.data.employeeId}`);
  revalidatePath("/admin/users");
  if (parsed.data.adminUserIdForRevalidate) {
    revalidatePath(`/admin/users/${parsed.data.adminUserIdForRevalidate}`);
  }
  revalidatePath("/employee/profile");

  return { ok: true };
}
