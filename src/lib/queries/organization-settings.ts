import { prisma } from "@/lib/db";

const SINGLETON_ID = "singleton" as const;

/**
 * Whether employees may clock in/out from their logged-in account (in addition to the kiosk).
 * Missing row defaults to false (kiosk-only).
 */
export async function getEmployeeAccountClockEnabled(): Promise<boolean> {
  const row = await prisma.organizationSettings.findUnique({
    where: { id: SINGLETON_ID },
    select: { employeeAccountClockEnabled: true },
  });
  return row?.employeeAccountClockEnabled ?? false;
}
