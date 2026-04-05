"use server";

import { compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  findEmployeeByTerminalIdentifier,
  findOpenPunchForEmployee,
  getShiftAssignmentForEmployee,
} from "@/lib/queries/time-clock";
import { getEffectiveHourCaps } from "@/lib/services/hours";
import {
  notifyLateClockIn,
  notifyWeeklyHourCapAfterClockOut,
} from "@/lib/services/time-clock-notify";
import { writeAuditLog } from "@/lib/services/audit";
import { signPayload, verifyPayload } from "@/lib/terminal/signed-cookie";
import {
  clockInEarlyMinutes,
  clockInLateAfterMinutes,
  kioskCookieHours,
  terminalWorkerSessionMinutes,
} from "@/lib/time-clock/constants";
import { sumWorkedMinutesInIsoWeek } from "@/lib/time-clock/worked-minutes";

const COOKIE_KIOSK = "timeclock_kiosk";
const COOKIE_WORKER = "timeclock_worker";

type KioskPayload = { v: 1; exp: number };
type WorkerPayload = { v: 1; exp: number; employeeId: string };

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function readKiosk(): Promise<KioskPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_KIOSK)?.value;
  const p = verifyPayload<KioskPayload>(raw);
  if (!p || p.v !== 1 || p.exp <= nowSec()) return null;
  return p;
}

async function readWorker(): Promise<WorkerPayload | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_WORKER)?.value;
  const p = verifyPayload<WorkerPayload>(raw);
  if (!p || p.v !== 1 || p.exp <= nowSec()) return null;
  return p;
}

async function requireKiosk(): Promise<KioskPayload> {
  const k = await readKiosk();
  if (!k) throw new Error("This kiosk is not activated.");
  return k;
}

async function requireWorker(): Promise<WorkerPayload> {
  await requireKiosk();
  const w = await readWorker();
  if (!w) throw new Error("Sign in first.");
  return w;
}

async function requireManagerForAction(): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return { error: "Manager access required." };
  }
  return { ok: true };
}

export async function lockTimeClockTerminal(
  _prev: unknown,
  _formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  void _prev;
  void _formData;
  const gate = await requireManagerForAction();
  if ("error" in gate) return gate;

  const hours = kioskCookieHours();
  const exp = nowSec() + hours * 3600;
  const token = signPayload({ v: 1, exp } satisfies KioskPayload);

  const jar = await cookies();
  jar.set(COOKIE_KIOSK, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: hours * 3600,
  });

  revalidatePath("/terminal");
  revalidatePath("/terminal/setup");
  return { ok: true };
}

export async function unlockTimeClockTerminal(
  _prev: unknown,
  _formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  void _prev;
  void _formData;
  const gate = await requireManagerForAction();
  if ("error" in gate) return gate;

  const jar = await cookies();
  jar.delete(COOKIE_KIOSK);
  jar.delete(COOKIE_WORKER);

  revalidatePath("/terminal");
  revalidatePath("/terminal/setup");
  return { ok: true };
}

export async function terminalSignIn(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireKiosk();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kiosk inactive." };
  }

  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Enter your email or employee ID and password." };
  }

  const employee = await findEmployeeByTerminalIdentifier(identifier);
  if (!employee) {
    return { error: "No employee matches that email or ID." };
  }

  const user = await prisma.user.findUnique({
    where: { id: employee.userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return { error: "Account cannot sign in here." };
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Incorrect password." };
  }

  const mins = terminalWorkerSessionMinutes();
  const exp = nowSec() + mins * 60;
  const token = signPayload({
    v: 1,
    exp,
    employeeId: employee.id,
  } satisfies WorkerPayload);

  const jar = await cookies();
  jar.set(COOKIE_WORKER, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: mins * 60,
  });

  revalidatePath("/terminal");
  return { ok: true };
}

export async function terminalSignOut(): Promise<never> {
  const jar = await cookies();
  jar.delete(COOKIE_WORKER);
  revalidatePath("/terminal");
  redirect("/terminal");
}

export async function terminalClockIn(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  let worker: WorkerPayload;
  try {
    worker = await requireWorker();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unauthorized." };
  }

  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!assignmentId) {
    return { error: "Missing shift." };
  }

  const now = new Date();
  const open = await findOpenPunchForEmployee(worker.employeeId);
  if (open) {
    return { error: "Clock out of your current shift first." };
  }

  const assignment = await getShiftAssignmentForEmployee(
    assignmentId,
    worker.employeeId,
  );
  if (!assignment) {
    return { error: "Shift not found." };
  }
  if (assignment.timePunch) {
    return { error: "This shift already has a time punch." };
  }

  const earlyMs = clockInEarlyMinutes() * 60 * 1000;
  const early = new Date(assignment.shift.startsAt.getTime() - earlyMs);
  if (now < early || now > assignment.shift.endsAt) {
    return { error: "Clock-in is not allowed for this shift right now." };
  }

  const punch = await prisma.shiftTimePunch.create({
    data: {
      shiftAssignmentId: assignment.id,
      clockInAt: now,
      clockInNote: note,
    },
  });

  await writeAuditLog({
    actorUserId: null,
    entityType: "ShiftTimePunch",
    entityId: punch.id,
    action: "TIME_CLOCK_IN",
    payload: {
      employeeId: worker.employeeId,
      shiftAssignmentId: assignment.id,
      terminal: true,
    },
  });

  const lateMs = clockInLateAfterMinutes() * 60 * 1000;
  if (now.getTime() > assignment.shift.startsAt.getTime() + lateMs) {
    const u = assignment.employee.user;
    const employeeLabel = u.name?.trim() || u.email;
    await notifyLateClockIn({
      employeeLabel,
      departmentName: assignment.shift.department.name,
      scheduledStart: assignment.shift.startsAt,
      minutesAfterStart: Math.round(
        (now.getTime() - assignment.shift.startsAt.getTime()) / 60000,
      ),
    });
  }

  revalidatePath("/terminal");
  return { ok: true };
}

export async function terminalClockOut(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  let worker: WorkerPayload;
  try {
    worker = await requireWorker();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unauthorized." };
  }

  const note = String(formData.get("note") ?? "").trim() || null;
  const now = new Date();

  const open = await findOpenPunchForEmployee(worker.employeeId);
  if (!open || open.assignment.employeeId !== worker.employeeId) {
    return { error: "You are not clocked in." };
  }

  await prisma.shiftTimePunch.update({
    where: { id: open.id },
    data: { clockOutAt: now, clockOutNote: note },
  });

  await writeAuditLog({
    actorUserId: null,
    entityType: "ShiftTimePunch",
    entityId: open.id,
    action: "TIME_CLOCK_OUT",
    payload: {
      employeeId: worker.employeeId,
      shiftAssignmentId: open.shiftAssignmentId,
      terminal: true,
    },
  });

  const [empRow, caps, workedWeek] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: worker.employeeId },
      include: { user: { select: { name: true, email: true } } },
    }),
    getEffectiveHourCaps(worker.employeeId),
    sumWorkedMinutesInIsoWeek(worker.employeeId, now),
  ]);
  if (empRow && caps.weeklyMaxMinutes != null) {
    const employeeLabel =
      empRow.user.name?.trim() || empRow.user.email || "Employee";
    await notifyWeeklyHourCapAfterClockOut({
      employeeId: worker.employeeId,
      employeeLabel,
      workedMinutes: workedWeek,
      weeklyMaxMinutes: caps.weeklyMaxMinutes,
      now,
    });
  }

  revalidatePath("/terminal");
  return { ok: true };
}
