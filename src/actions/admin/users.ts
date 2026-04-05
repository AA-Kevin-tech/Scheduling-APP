"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { requireAdmin, requireAdminOrManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { normalizeIanaTimezone } from "@/lib/schedule/tz";

const assignmentSchema = z.array(
  z.object({
    departmentId: z.string().min(1),
    roleId: z.string().nullable().optional(),
    isPrimary: z.boolean(),
  }),
).min(1);

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]),
  employeeNumber: z.string().nullable().optional(),
  timezone: z.string().optional(),
  locationIds: z.array(z.string()).min(1),
  assignments: assignmentSchema,
});

function parseAssignmentsJson(raw: unknown): z.infer<typeof assignmentSchema> | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    const parsed = assignmentSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function createEmployeeUser(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdminOrManager();

  const assignments = parseAssignmentsJson(formData.get("assignments"));
  if (!assignments) {
    return { error: "Add at least one department assignment." };
  }

  const locationIds = formData.getAll("locationIds").map(String).filter(Boolean);
  if (locationIds.length === 0) {
    return { error: "Select at least one location." };
  }

  let role = String(formData.get("role") ?? "EMPLOYEE") as UserRole;
  if (session.user.role === "MANAGER") {
    role = "EMPLOYEE";
  }

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role,
    employeeNumber: emptyToNull(formData.get("employeeNumber")),
    timezone: formData.get("timezone"),
    locationIds,
    assignments,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const dup = await prisma.user.findUnique({ where: { email } });
  if (dup) {
    return { error: "A user with this email already exists." };
  }

  const deptIds = parsed.data.assignments.map((a) => a.departmentId);
  if (new Set(deptIds).size !== deptIds.length) {
    return { error: "Each department can only appear once." };
  }

  const locCount = await prisma.location.count({
    where: { id: { in: parsed.data.locationIds } },
  });
  if (locCount !== parsed.data.locationIds.length) {
    return { error: "Invalid location selection." };
  }

  for (const a of parsed.data.assignments) {
    if (a.roleId) {
      const ok = await prisma.role.findFirst({
        where: { id: a.roleId, departmentId: a.departmentId },
      });
      if (!ok) return { error: "Each role must match its department." };
    }
  }

  const passwordHash = await hash(parsed.data.password, 12);

  let primarySet = false;
  const deptRows = parsed.data.assignments.map((a) => {
    const isPrimary = a.isPrimary && !primarySet;
    if (isPrimary) primarySet = true;
    return {
      departmentId: a.departmentId,
      roleId: a.roleId?.trim() ? a.roleId : null,
      isPrimary,
    };
  });
  if (!deptRows.some((r) => r.isPrimary) && deptRows.length > 0) {
    deptRows[0].isPrimary = true;
  }

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        name: parsed.data.name.trim(),
        passwordHash,
        role: parsed.data.role,
      },
    });

    const emp = await tx.employee.create({
      data: {
        userId: u.id,
        employeeNumber: parsed.data.employeeNumber?.trim() || null,
        timezone: normalizeIanaTimezone(
          typeof parsed.data.timezone === "string"
            ? parsed.data.timezone
            : undefined,
        ),
        locations: {
          create: parsed.data.locationIds.map((locationId, i) => ({
            locationId,
            isPrimary: i === 0,
          })),
        },
        departments: {
          create: deptRows.map((d) => ({
            departmentId: d.departmentId,
            roleId: d.roleId,
            isPrimary: d.isPrimary,
          })),
        },
      },
    });

    return { user: u, employee: emp };
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "User",
    entityId: user.user.id,
    action: "CREATE",
    payload: { email, role: parsed.data.role },
  });

  revalidatePath("/admin/users");
  revalidatePath("/manager/employees");
  revalidatePath("/manager/schedule");
  return { ok: true };
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]),
  employeeNumber: z.string().nullable().optional(),
  timezone: z.string().optional(),
  locationIds: z.array(z.string()).min(1),
  assignments: assignmentSchema,
});

export async function updateEmployeeUser(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();

  const assignments = parseAssignmentsJson(formData.get("assignments"));
  if (!assignments) {
    return { error: "Add at least one department assignment." };
  }

  const locationIds = formData.getAll("locationIds").map(String).filter(Boolean);
  if (locationIds.length === 0) {
    return { error: "Select at least one location." };
  }

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    role: formData.get("role"),
    employeeNumber: emptyToNull(formData.get("employeeNumber")),
    timezone: formData.get("timezone"),
    locationIds,
    assignments,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    include: { employee: true },
  });
  if (!user?.employee) {
    return { error: "User or employee profile not found." };
  }

  const deptIds = parsed.data.assignments.map((a) => a.departmentId);
  if (new Set(deptIds).size !== deptIds.length) {
    return { error: "Each department can only appear once." };
  }

  const locCount = await prisma.location.count({
    where: { id: { in: parsed.data.locationIds } },
  });
  if (locCount !== parsed.data.locationIds.length) {
    return { error: "Invalid location selection." };
  }

  for (const a of parsed.data.assignments) {
    if (a.roleId) {
      const ok = await prisma.role.findFirst({
        where: { id: a.roleId, departmentId: a.departmentId },
      });
      if (!ok) return { error: "Each role must match its department." };
    }
  }

  let primarySet = false;
  const deptRows = parsed.data.assignments.map((a) => {
    const isPrimary = a.isPrimary && !primarySet;
    if (isPrimary) primarySet = true;
    return {
      departmentId: a.departmentId,
      roleId: a.roleId?.trim() ? a.roleId : null,
      isPrimary,
    };
  });
  if (!deptRows.some((r) => r.isPrimary) && deptRows.length > 0) {
    deptRows[0].isPrimary = true;
  }

  const empId = user.employee.id;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.data.userId },
      data: {
        name: parsed.data.name.trim(),
        role: parsed.data.role,
      },
    });
    await tx.employee.update({
      where: { id: empId },
      data: {
        employeeNumber: parsed.data.employeeNumber?.trim() || null,
        timezone: normalizeIanaTimezone(
          typeof parsed.data.timezone === "string"
            ? parsed.data.timezone
            : undefined,
        ),
      },
    });
    await tx.employeeLocation.deleteMany({ where: { employeeId: empId } });
    await tx.employeeDepartment.deleteMany({ where: { employeeId: empId } });
    await tx.employeeLocation.createMany({
      data: parsed.data.locationIds.map((locationId, i) => ({
        employeeId: empId,
        locationId,
        isPrimary: i === 0,
      })),
    });
    await tx.employeeDepartment.createMany({
      data: deptRows.map((d) => ({
        employeeId: empId,
        departmentId: d.departmentId,
        roleId: d.roleId,
        isPrimary: d.isPrimary,
      })),
    });
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "User",
    entityId: parsed.data.userId,
    action: "UPDATE",
    payload: { role: parsed.data.role },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/manager/employees");
  revalidatePath("/manager/schedule");
  revalidatePath("/employee/schedule");
  return { ok: true };
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}
