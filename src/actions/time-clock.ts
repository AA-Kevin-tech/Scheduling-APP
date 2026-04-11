"use server";

import type { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessManagerRoutes } from "@/lib/auth/roles";
import { findEmployeeByTimeClockPin } from "@/lib/queries/time-clock";
import { getEmployeeAccountClockEnabled } from "@/lib/queries/organization-settings";
import {
  performClockIn,
  performClockOut,
} from "@/lib/services/time-clock-punch";
import { signPayload, verifyPayload } from "@/lib/terminal/signed-cookie";
import {
  kioskCookieHours,
  terminalWorkerSessionMinutes,
} from "@/lib/time-clock/constants";
import { requireEmployeeProfile } from "@/lib/auth/guards";

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
  if (!canAccessManagerRoutes(session.user.role as UserRole)) {
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

  const pin = String(formData.get("pin") ?? "").trim();

  if (!pin) {
    return { error: "Enter your time clock PIN." };
  }
  if (!/^\d{4,8}$/.test(pin)) {
    return { error: "PIN must be 4–8 digits." };
  }

  const resolved = await findEmployeeByTimeClockPin(pin);
  if (resolved.kind === "ambiguous") {
    return {
      error:
        "This PIN is linked to more than one active employee. Ask a manager to assign unique PINs.",
    };
  }
  if (resolved.kind === "not_found") {
    return { error: "Invalid PIN." };
  }

  const mins = terminalWorkerSessionMinutes();
  const exp = nowSec() + mins * 60;
  const token = signPayload({
    v: 1,
    exp,
    employeeId: resolved.employee.id,
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
  const result = await performClockIn({
    employeeId: worker.employeeId,
    assignmentId,
    note,
    now,
    origin: { source: "terminal" },
  });
  if ("error" in result) return result;
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

  const result = await performClockOut({
    employeeId: worker.employeeId,
    note,
    now,
    origin: { source: "terminal" },
  });
  if ("error" in result) return result;
  revalidatePath("/terminal");
  return { ok: true };
}

export async function employeeAccountClockIn(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { session, employeeId } = await requireEmployeeProfile();
  const allowed = await getEmployeeAccountClockEnabled();
  if (!allowed) {
    return {
      error: "Clock in and out are only available at the work kiosk.",
    };
  }

  const assignmentId = String(formData.get("assignmentId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!assignmentId) {
    return { error: "Missing shift." };
  }

  const now = new Date();
  return performClockIn({
    employeeId,
    assignmentId,
    note,
    now,
    origin: { source: "employee_account", actorUserId: session.user.id },
  });
}

export async function employeeAccountClockOut(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { session, employeeId } = await requireEmployeeProfile();
  const allowed = await getEmployeeAccountClockEnabled();
  if (!allowed) {
    return {
      error: "Clock in and out are only available at the work kiosk.",
    };
  }

  const note = String(formData.get("note") ?? "").trim() || null;
  const now = new Date();

  return performClockOut({
    employeeId,
    note,
    now,
    origin: { source: "employee_account", actorUserId: session.user.id },
  });
}
