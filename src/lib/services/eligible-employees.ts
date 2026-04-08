import { shiftVenueId } from "@/lib/auth/location-scope";
import { prisma } from "@/lib/db";
import { validateEmployeeTakingShift } from "@/lib/services/swap-context";

export type EligibleRow = {
  employeeId: string;
  name: string | null;
  email: string | null;
  ok: boolean;
  reasons: string[];
};

/** Suggest who could take this shift (open shift / swap target). */
export async function listEligibilityForShift(shiftId: string): Promise<EligibleRow[]> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      department: true,
      role: true,
    },
  });
  if (!shift) return [];

  const venueId = shiftVenueId(shift);

  const employees = await prisma.employee.findMany({
    where: {
      archivedAt: null,
      OR: [
        { locations: { some: { locationId: venueId } } },
        { departments: { some: { department: { locationId: venueId } } } },
      ],
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  const rows: EligibleRow[] = [];
  for (const e of employees) {
    const v = await validateEmployeeTakingShift({
      takerEmployeeId: e.id,
      shift,
      dropAssignmentId: null,
    });
    rows.push({
      employeeId: e.id,
      name: e.user.name,
      email: e.user.email,
      ok: v.ok,
      reasons: v.reasons,
    });
  }

  return rows.sort((a, b) => {
    if (a.ok === b.ok) return (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "");
    return a.ok ? -1 : 1;
  });
}
