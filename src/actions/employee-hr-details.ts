"use server";

import { revalidatePath } from "next/cache";
import {
  CompensationType,
  EmploymentType,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { requireAdminOrManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";

const schema = z.object({
  employeeId: z.string().min(1),
  managerNotes: z.string().optional(),
  compensationType: z.nativeEnum(CompensationType),
  hourlyRate: z.string().optional(),
  annualSalary: z.string().optional(),
  employmentType: z.nativeEnum(EmploymentType),
  adminUserIdForRevalidate: z.string().optional(),
});

function parseMoney(raw: string | undefined, maxDecimals: number): Prisma.Decimal | null {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return new Prisma.Decimal(n.toFixed(maxDecimals));
}

export async function updateEmployeeHrDetails(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdminOrManager();

  const parsed = schema.safeParse({
    employeeId: formData.get("employeeId"),
    managerNotes: formData.get("managerNotes") ?? undefined,
    compensationType: formData.get("compensationType"),
    hourlyRate: formData.get("hourlyRate") ?? undefined,
    annualSalary: formData.get("annualSalary") ?? undefined,
    employmentType: formData.get("employmentType"),
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

  const { compensationType } = parsed.data;

  let hourlyRate: Prisma.Decimal | null = null;
  let annualSalary: Prisma.Decimal | null = null;

  if (compensationType === CompensationType.HOURLY) {
    hourlyRate = parseMoney(parsed.data.hourlyRate, 2);
    if (hourlyRate === null && (parsed.data.hourlyRate ?? "").trim() !== "") {
      return { error: "Enter a valid hourly rate or leave blank." };
    }
  } else {
    annualSalary = parseMoney(parsed.data.annualSalary, 2);
    if (annualSalary === null && (parsed.data.annualSalary ?? "").trim() !== "") {
      return { error: "Enter a valid annual salary or leave blank." };
    }
  }

  await prisma.employee.update({
    where: { id: parsed.data.employeeId },
    data: {
      managerNotes: parsed.data.managerNotes?.trim() || null,
      compensationType,
      hourlyRate: compensationType === CompensationType.HOURLY ? hourlyRate : null,
      annualSalary: compensationType === CompensationType.SALARY ? annualSalary : null,
      employmentType: parsed.data.employmentType,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "Employee",
    entityId: parsed.data.employeeId,
    action: "UPDATE_HR_DETAILS",
    payload: {
      employmentType: parsed.data.employmentType,
      compensationType,
    },
  });

  revalidatePath("/manager/employees");
  revalidatePath(`/manager/employees/${parsed.data.employeeId}`);
  revalidatePath("/admin/users");
  if (parsed.data.adminUserIdForRevalidate) {
    revalidatePath(`/admin/users/${parsed.data.adminUserIdForRevalidate}`);
  }

  return { ok: true };
}
