import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { timeClockPinLookupDigest } from "./pin-lookup";

/** Only active (non-archived) employees participate in kiosk PIN uniqueness. */
const activeEmployee = { archivedAt: null } as const;

/**
 * Returns true if no other active employee is using this PIN (lookup + bcrypt, including legacy rows).
 */
export async function isTimeClockPinAvailable(
  plainPin: string,
  excludeEmployeeId: string | null,
): Promise<boolean> {
  let digest: string;
  try {
    digest = timeClockPinLookupDigest(plainPin);
  } catch {
    return false;
  }

  const lookupWhere = {
    ...activeEmployee,
    timeClockPinLookup: digest,
    ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
  };

  const byLookup = await prisma.employee.findMany({
    where: lookupWhere,
    select: { id: true, timeClockPinHash: true },
  });

  for (const r of byLookup) {
    if (r.timeClockPinHash && (await compare(plainPin, r.timeClockPinHash))) {
      return false;
    }
  }

  const legacy = await prisma.employee.findMany({
    where: {
      ...activeEmployee,
      timeClockPinHash: { not: null },
      timeClockPinLookup: null,
      ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
    },
    select: { id: true, timeClockPinHash: true },
  });

  for (const r of legacy) {
    if (r.timeClockPinHash && (await compare(plainPin, r.timeClockPinHash))) {
      return false;
    }
  }

  return true;
}
