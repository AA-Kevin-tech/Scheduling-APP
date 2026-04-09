"use server";

import { randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import {
  type CompensationType,
  type EmploymentType,
  Prisma,
} from "@prisma/client";
import { getBaseSchedulingLocationIdsForSession } from "@/lib/auth/location-scope";
import { requireAdminOrManager } from "@/lib/auth/guards";
import {
  encryptPayrollVaultPayload,
  type PayrollVaultPayload,
} from "@/lib/crypto/payroll-vault";
import { publicAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { sendEmployeeOnboardingInviteEmail } from "@/lib/email";
import { normalizeIanaTimezone } from "@/lib/schedule/tz";
import { writeAuditLog } from "@/lib/services/audit";
import { timeClockPinLookupDigest } from "@/lib/time-clock/pin-lookup";
import { userDisplayName } from "@/lib/user-display-name";

const assignmentSchema = z
  .array(
    z.object({
      departmentId: z.string().min(1),
      roleId: z.string().nullable().optional(),
      isPrimary: z.boolean(),
    }),
  )
  .min(1);

const INVITE_DAYS = 7;

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

async function validateAssignments(
  assignments: z.infer<typeof assignmentSchema>,
  locationIds: string[],
): Promise<string | null> {
  const deptIds = assignments.map((a) => a.departmentId);
  if (new Set(deptIds).size !== deptIds.length) {
    return "Each department can only appear once.";
  }

  const locCount = await prisma.location.count({
    where: { id: { in: locationIds } },
  });
  if (locCount !== locationIds.length) {
    return "Invalid location selection.";
  }

  const uniqueDeptIds = [...new Set(deptIds)];
  const depts = await prisma.department.findMany({
    where: { id: { in: uniqueDeptIds } },
    select: { id: true, locationId: true },
  });
  if (depts.length !== uniqueDeptIds.length) {
    return "Invalid department.";
  }
  const locSet = new Set(locationIds);
  for (const d of depts) {
    if (!locSet.has(d.locationId)) {
      return "Each department must belong to a selected work location.";
    }
  }

  for (const a of assignments) {
    if (a.roleId) {
      const ok = await prisma.role.findFirst({
        where: { id: a.roleId, departmentId: a.departmentId },
      });
      if (!ok) return "Each role must match its department.";
    }
  }
  return null;
}

const createInviteSchema = z.object({
  email: z.string().email(),
  employeeNumber: z.string().nullable().optional(),
  locationIds: z.array(z.string()).min(1),
  assignments: assignmentSchema,
});

export async function createEmployeeInvite(
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

  const parsed = createInviteSchema.safeParse({
    email: formData.get("email"),
    employeeNumber: emptyToNull(formData.get("employeeNumber")),
    locationIds,
    assignments,
  });

  if (!parsed.success) {
    return { error: zodFormError(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "A user with this email already exists." };
  }

  const assignErr = await validateAssignments(parsed.data.assignments, locationIds);
  if (assignErr) return { error: assignErr };

  if (session.user.role === "MANAGER") {
    const allowed = await getBaseSchedulingLocationIdsForSession(session);
    if (!allowed?.length) {
      return { error: "Your account is not assigned to any venue." };
    }
    for (const id of parsed.data.locationIds) {
      if (!allowed.includes(id)) {
        return { error: "You can only invite people to venues you manage." };
      }
    }
  }

  if (parsed.data.employeeNumber?.trim()) {
    const num = parsed.data.employeeNumber.trim();
    const taken = await prisma.employee.findUnique({
      where: { employeeNumber: num },
    });
    if (taken) {
      return { error: "That employee number is already in use." };
    }
  }

  await prisma.employeeInvite.deleteMany({
    where: {
      email,
      consumedAt: null,
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000,
  );

  const assignmentsJson: Prisma.InputJsonValue = parsed.data.assignments.map(
    (a) => ({
      departmentId: a.departmentId,
      roleId: a.roleId?.trim() ? a.roleId : null,
      isPrimary: a.isPrimary,
    }),
  );

  await prisma.employeeInvite.create({
    data: {
      email,
      token,
      expiresAt,
      invitedById: session.user.id,
      employeeNumber: parsed.data.employeeNumber?.trim() || null,
      locationIds,
      assignments: assignmentsJson,
    },
  });

  const onboardingUrl = `${publicAppBaseUrl()}/onboarding/${encodeURIComponent(token)}`;

  try {
    await sendEmployeeOnboardingInviteEmail(email, onboardingUrl);
  } catch (e) {
    console.error(e);
    await prisma.employeeInvite.deleteMany({ where: { token } });
    return { error: "Could not send email. Check RESEND_API_KEY and EMAIL_FROM." };
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    entityType: "EmployeeInvite",
    entityId: email,
    action: "CREATE",
    payload: { expiresAt: expiresAt.toISOString() },
  });

  return { ok: true };
}

const PIN_REGEX = /^\d{4,8}$/;

const filingStatuses = [
  "SINGLE",
  "MARRIED_JOINT",
  "MARRIED_SEPARATE",
  "HEAD_OF_HOUSEHOLD",
] as const;

const completeSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    passwordConfirm: z.string().min(1),
    pin: z.string(),
    pinConfirm: z.string(),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim(),
    timezone: z.string().min(1),
    phone: z.string().optional(),
    addressLine1: z.string().trim().min(1),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: z
      .string()
      .trim()
      .length(2)
      .transform((s) => s.toUpperCase()),
    postalCode: z.string().trim().min(3),
    ssn: z.string().min(1),
    federalFilingStatus: z.enum(filingStatuses),
    federalDependentsAmount: z.string().optional(),
    federalExtraWithholding: z.string().optional(),
    stateCode: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .length(2)
        .transform((s) => s.toUpperCase())
        .optional(),
    ),
    stateAllowancesOrNotes: z.string().optional(),
    stateExtraWithholding: z.string().optional(),
    bankName: z.string().optional(),
    routingNumber: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/\D/g, "") : ""),
      z.string().length(9),
    ),
    accountNumber: z.string().trim().min(4),
    accountNumberConfirm: z.string().trim().min(4),
    accountType: z.enum(["checking", "savings"]),
    hireDate: z.string().optional(),
    compensationType: z.enum(["HOURLY", "SALARY"]),
    hourlyRate: z.string().optional(),
    annualSalary: z.string().optional(),
    employmentType: z.enum(["FULL_TIME", "PART_TIME"]),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["passwordConfirm"],
      });
    }
    if (data.pin !== data.pinConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PIN and confirmation do not match.",
        path: ["pinConfirm"],
      });
    }
    if (!PIN_REGEX.test(data.pin.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PIN must be 4–8 digits.",
        path: ["pin"],
      });
    }
    if (data.accountNumber !== data.accountNumberConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account numbers do not match.",
        path: ["accountNumberConfirm"],
      });
    }
    const digits = data.ssn.replace(/\D/g, "");
    if (digits.length !== 9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid 9-digit Social Security number.",
        path: ["ssn"],
      });
    }
  });

async function pinIsUnique(plainPin: string): Promise<boolean> {
  let digest: string;
  try {
    digest = timeClockPinLookupDigest(plainPin);
  } catch {
    return false;
  }
  const clash = await prisma.employee.findFirst({
    where: { timeClockPinLookup: digest },
    select: { id: true },
  });
  if (clash) return false;

  const legacy = await prisma.employee.findMany({
    where: { timeClockPinHash: { not: null }, timeClockPinLookup: null },
    select: { timeClockPinHash: true },
  });
  for (const r of legacy) {
    if (r.timeClockPinHash && (await compare(plainPin, r.timeClockPinHash))) {
      return false;
    }
  }
  return true;
}

export async function completeEmployeeOnboarding(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const raw = {
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    pin: formData.get("pin"),
    pinConfirm: formData.get("pinConfirm"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    timezone: formData.get("timezone"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    ssn: formData.get("ssn"),
    federalFilingStatus: formData.get("federalFilingStatus"),
    federalDependentsAmount: formData.get("federalDependentsAmount"),
    federalExtraWithholding: formData.get("federalExtraWithholding"),
    stateCode: formData.get("stateCode"),
    stateAllowancesOrNotes: formData.get("stateAllowancesOrNotes"),
    stateExtraWithholding: formData.get("stateExtraWithholding"),
    bankName: formData.get("bankName"),
    routingNumber: formData.get("routingNumber"),
    accountNumber: formData.get("accountNumber"),
    accountNumberConfirm: formData.get("accountNumberConfirm"),
    accountType: formData.get("accountType"),
    hireDate: formData.get("hireDate"),
    compensationType: formData.get("compensationType"),
    hourlyRate: formData.get("hourlyRate"),
    annualSalary: formData.get("annualSalary"),
    employmentType: formData.get("employmentType"),
  };

  const parsed = completeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: zodFormError(parsed.error) };
  }

  const invite = await prisma.employeeInvite.findUnique({
    where: { token: parsed.data.token },
  });

  if (!invite || invite.consumedAt || invite.expiresAt < new Date()) {
    return { error: "This onboarding link is invalid or has expired." };
  }

  const email = invite.email.toLowerCase().trim();
  const dup = await prisma.user.findUnique({ where: { email } });
  if (dup) {
    return { error: "An account already exists for this email." };
  }

  const assignments = assignmentSchema.safeParse(invite.assignments);
  if (!assignments.success) {
    return { error: "This invite is misconfigured. Ask your manager for a new invite." };
  }

  const assignErr = await validateAssignments(
    assignments.data,
    invite.locationIds,
  );
  if (assignErr) {
    return { error: "This invite is misconfigured. Ask your manager for a new invite." };
  }

  const pin = parsed.data.pin.trim();
  if (!(await pinIsUnique(pin))) {
    return { error: "That time clock PIN is already in use. Choose another." };
  }

  const routingDigits = parsed.data.routingNumber;
  const ssnDigits = parsed.data.ssn.replace(/\D/g, "");
  const vaultPayload: PayrollVaultPayload = {
    ssn: `${ssnDigits.slice(0, 3)}-${ssnDigits.slice(3, 5)}-${ssnDigits.slice(5)}`,
    federalFilingStatus: parsed.data.federalFilingStatus,
    federalDependentsAmount: parsed.data.federalDependentsAmount?.trim() || undefined,
    federalExtraWithholding: parsed.data.federalExtraWithholding?.trim() || undefined,
    stateCode: parsed.data.stateCode?.trim() || undefined,
    stateAllowancesOrNotes: parsed.data.stateAllowancesOrNotes?.trim() || undefined,
    stateExtraWithholding: parsed.data.stateExtraWithholding?.trim() || undefined,
    directDeposits: [
      {
        bankName: parsed.data.bankName?.trim() || undefined,
        routingNumber: routingDigits,
        accountNumber: parsed.data.accountNumber.trim(),
        accountType: parsed.data.accountType,
      },
    ],
  };

  let encrypted: ReturnType<typeof encryptPayrollVaultPayload>;
  try {
    encrypted = encryptPayrollVaultPayload(vaultPayload);
  } catch (e) {
    console.error(e);
    return {
      error:
        "Server could not encrypt payroll data. Set PAYROLL_VAULT_KEY (production) or AUTH_SECRET (development).",
    };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const timeClockPinHash = await hash(pin, 12);
  let timeClockPinLookup: string;
  try {
    timeClockPinLookup = timeClockPinLookupDigest(pin);
  } catch (e) {
    console.error(e);
    return {
      error:
        "Server could not process time clock PIN. Ensure AUTH_SECRET is configured.",
    };
  }
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  const displayName = userDisplayName({ firstName, lastName });

  let primarySet = false;
  const deptRows = assignments.data.map((a) => {
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

  let hireDate: Date | null = null;
  if (parsed.data.hireDate?.trim()) {
    const d = new Date(`${parsed.data.hireDate.trim()}T12:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) hireDate = d;
  }

  const compensationType = parsed.data.compensationType as CompensationType;
  const employmentType = parsed.data.employmentType as EmploymentType;
  let hourlyRate: Prisma.Decimal | undefined;
  let annualSalary: Prisma.Decimal | undefined;
  if (compensationType === "HOURLY" && parsed.data.hourlyRate?.trim()) {
    const n = Number(parsed.data.hourlyRate.trim());
    if (!Number.isFinite(n) || n < 0) {
      return { error: "Enter a valid hourly rate." };
    }
    hourlyRate = new Prisma.Decimal(n.toFixed(2));
  }
  if (compensationType === "SALARY" && parsed.data.annualSalary?.trim()) {
    const n = Number(parsed.data.annualSalary.trim());
    if (!Number.isFinite(n) || n < 0) {
      return { error: "Enter a valid annual salary." };
    }
    annualSalary = new Prisma.Decimal(n.toFixed(2));
  }

  const phone = parsed.data.phone?.trim() || null;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName: lastName || null,
          name: displayName,
          passwordHash,
          role: "EMPLOYEE",
          notifyEmail: true,
        },
      });

      const emp = await tx.employee.create({
        data: {
          userId: user.id,
          employeeNumber: invite.employeeNumber?.trim() || null,
          timezone: normalizeIanaTimezone(parsed.data.timezone),
          phone,
          hireDate,
          compensationType,
          employmentType,
          hourlyRate,
          annualSalary,
          timeClockPinHash,
          timeClockPinLookup,
          addressLine1: parsed.data.addressLine1.trim(),
          addressLine2: parsed.data.addressLine2?.trim() || null,
          city: parsed.data.city.trim(),
          state: parsed.data.state,
          postalCode: parsed.data.postalCode.trim(),
          locations: {
            create: invite.locationIds.map((locationId, i) => ({
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

      await tx.employeePayrollVault.create({
        data: {
          employeeId: emp.id,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
        },
      });

      await tx.employeeInvite.update({
        where: { id: invite.id },
        data: {
          consumedAt: new Date(),
          stage: "COMPLETED",
        },
      });
    });
  } catch (e) {
    console.error(e);
    return { error: "Could not complete onboarding. Try again or contact support." };
  }

  const newUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (newUser) {
    await writeAuditLog({
      actorUserId: newUser.id,
      entityType: "User",
      entityId: newUser.id,
      action: "ONBOARDING_COMPLETE",
      payload: { viaInvite: true },
    });
  }

  return { ok: true };
}
