"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import {
  assertDepartmentsBelongToLocations,
  getBaseSchedulingLocationIdsForSession,
  syncManagerLocationsForUser,
} from "@/lib/auth/location-scope";
import {
  isOrgWideSchedulingRole,
  ORG_WIDE_USER_ROLES,
} from "@/lib/auth/roles";
import { requireAdmin, requireAdminOrManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit";
import { validateEmployeePhoneFormValue } from "@/lib/employee-phone-input";
import { normalizeIanaTimezone } from "@/lib/schedule/tz";
import { userDisplayName } from "@/lib/user-display-name";

const assignmentSchema = z.array(
  z.object({
    departmentId: z.string().min(1),
    roleId: z.string().nullable().optional(),
    isPrimary: z.boolean(),
  }),
).min(1);

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "IT", "PAYROLL", "MANAGER", "EMPLOYEE"]),
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
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    password: formData.get("password"),
    role,
    employeeNumber: emptyToNull(formData.get("employeeNumber")),
    timezone: formData.get("timezone"),
    locationIds,
    assignments,
  });

  if (!parsed.success) {
    return { error: zodFormError(parsed.error) };
  }

  const phoneChecked = validateEmployeePhoneFormValue(
    String(formData.get("phone") ?? ""),
  );
  if (!phoneChecked.ok) {
    return { error: phoneChecked.error };
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

  if (session.user.role === "MANAGER") {
    const allowed = await getBaseSchedulingLocationIdsForSession(session);
    if (!allowed?.length) {
      return { error: "Your account is not assigned to any venue." };
    }
    for (const id of parsed.data.locationIds) {
      if (!allowed.includes(id)) {
        return { error: "You can only assign locations you manage." };
      }
    }
  }

  const deptOkCreate = await assertDepartmentsBelongToLocations(
    parsed.data.assignments.map((a) => a.departmentId),
    parsed.data.locationIds,
  );
  if (!deptOkCreate) {
    return {
      error:
        "Each department must belong to one of the work locations you selected.",
    };
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
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const displayName = userDisplayName({ firstName, lastName });

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
        firstName,
        lastName: lastName || null,
        name: displayName,
        passwordHash,
        role: parsed.data.role,
      },
    });

    if (parsed.data.role === "MANAGER") {
      await syncManagerLocationsForUser(tx, u.id, parsed.data.locationIds);
    }

    const emp = await tx.employee.create({
      data: {
        userId: u.id,
        employeeNumber: parsed.data.employeeNumber?.trim() || null,
        phone: phoneChecked.phone,
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
  revalidatePath("/employee/profile");
  return { ok: true };
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim(),
  role: z.enum(["ADMIN", "IT", "PAYROLL", "MANAGER", "EMPLOYEE"]),
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
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
    employeeNumber: emptyToNull(formData.get("employeeNumber")),
    timezone: formData.get("timezone"),
    locationIds,
    assignments,
  });

  if (!parsed.success) {
    return { error: zodFormError(parsed.error) };
  }

  const phoneChecked = validateEmployeePhoneFormValue(
    String(formData.get("phone") ?? ""),
  );
  if (!phoneChecked.ok) {
    return { error: phoneChecked.error };
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

  const deptOk = await assertDepartmentsBelongToLocations(
    parsed.data.assignments.map((a) => a.departmentId),
    parsed.data.locationIds,
  );
  if (!deptOk) {
    return {
      error:
        "Each department must belong to one of the work locations you selected.",
    };
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
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const displayName = userDisplayName({ firstName, lastName });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.data.userId },
      data: {
        firstName,
        lastName: lastName || null,
        name: displayName,
        role: parsed.data.role,
      },
    });
    await tx.employee.update({
      where: { id: empId },
      data: {
        employeeNumber: parsed.data.employeeNumber?.trim() || null,
        phone: phoneChecked.phone,
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

    if (parsed.data.role === "MANAGER") {
      await syncManagerLocationsForUser(tx, parsed.data.userId, parsed.data.locationIds);
    } else {
      await tx.managerLocation.deleteMany({
        where: { userId: parsed.data.userId },
      });
    }
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
  revalidatePath("/employee/profile");
  return { ok: true };
}

const deleteUserSchema = z.object({
  userId: z.string().min(1),
  confirmEmail: z.string().min(1),
});

/**
 * Permanently removes the user account (and cascaded profile data). Admin only.
 * Managers use archive only (`setEmployeeArchivedFromUser`).
 */
export async function deleteUserFromAdmin(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireAdmin();

  const parsed = deleteUserSchema.safeParse({
    userId: formData.get("userId"),
    confirmEmail: formData.get("confirmEmail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors.join(", ") };
  }

  const userId = parsed.data.userId;
  const confirmEmail = parsed.data.confirmEmail.toLowerCase().trim();

  if (userId === session.user.id) {
    return { error: "You cannot delete your own account." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) {
    return { error: "User not found." };
  }

  if (user.email.toLowerCase() !== confirmEmail) {
    return { error: "Email does not match this account." };
  }

  if (isOrgWideSchedulingRole(user.role)) {
    const elevatedCount = await prisma.user.count({
      where: { role: { in: [...ORG_WIDE_USER_ROLES] } },
    });
    if (elevatedCount <= 1) {
      return {
        error:
          "Cannot delete the only organization admin (admin, IT, or payroll) account.",
      };
    }
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "User",
    entityId: user.id,
    action: "DELETE",
    payload: { email: user.email },
  });

  await prisma.user.delete({ where: { id: user.id } });

  revalidatePath("/admin/users");
  revalidatePath("/manager/employees");
  revalidatePath("/manager/schedule");
  redirect("/admin/users");
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v === null || v === "") return null;
  return String(v);
}

function zodFormError(err: z.ZodError): string {
  const flat = err.flatten();
  const parts = [
    ...flat.formErrors,
    ...Object.values(flat.fieldErrors).flat(),
  ];
  return parts.filter(Boolean).join(", ") || "Invalid form.";
}
