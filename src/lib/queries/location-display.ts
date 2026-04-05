import { prisma } from "@/lib/db";

/**
 * Label for an employee's assigned venue(s): primary location first, then others.
 */
export async function getVenueLabelForEmployee(
  employeeId: string,
): Promise<string | null> {
  const rows = await prisma.employeeLocation.findMany({
    where: { employeeId },
    include: { location: true },
    orderBy: [
      { isPrimary: "desc" },
      { location: { sortOrder: "asc" } },
    ],
  });
  if (rows.length === 0) return null;
  const names = rows.map((r) => r.location.name);
  return [...new Set(names)].join(", ");
}

/**
 * First venue by sort order (e.g. shared time-clock terminal at a fixed site).
 */
export async function getFirstVenueName(): Promise<string | null> {
  const loc = await prisma.location.findFirst({
    orderBy: { sortOrder: "asc" },
    select: { name: true },
  });
  return loc?.name ?? null;
}
