import { cookies } from "next/headers";
import type { Session } from "next-auth";
import type { Prisma, UserRole } from "@prisma/client";
import { isOrgWideSchedulingRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db";

/** Narrow scheduling UI to one venue; omit or `__all__` = full role scope. */
export const SCHEDULING_ACTIVE_VENUE_COOKIE = "scheduling_active_venue";

/**
 * Role-based venue list before the active-venue cookie is applied.
 * `null` = org-wide (IT / payroll / admin). Empty array = no access.
 */
export async function getBaseSchedulingLocationIdsForSession(
  session: Session,
): Promise<string[] | null> {
  const role = session.user?.role as UserRole | undefined;
  const userId = session.user?.id;
  const employeeId = session.user?.employeeId ?? null;
  if (!userId || !role) return [];

  if (isOrgWideSchedulingRole(role)) return null;

  if (role === "EMPLOYEE") {
    if (!employeeId) return [];
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        locations: { select: { locationId: true } },
        departments: {
          select: { department: { select: { locationId: true } } },
        },
      },
    });
    const fromLocs = emp?.locations.map((l) => l.locationId) ?? [];
    const fromDepts =
      emp?.departments.map((d) => d.department.locationId) ?? [];
    return [...new Set([...fromLocs, ...fromDepts])];
  }

  if (role === "MANAGER") {
    const mgr = await prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true },
    });
    if (mgr.length > 0) {
      return [...new Set(mgr.map((m) => m.locationId))];
    }
    if (employeeId) {
      const rows = await prisma.employeeLocation.findMany({
        where: { employeeId },
        select: { locationId: true },
      });
      return [...new Set(rows.map((r) => r.locationId))];
    }
    return [];
  }

  return [];
}

function resolveCookieAgainstBase(
  base: string[] | null,
  cookieValue: string | undefined,
  verifiedLocationId: string | null,
): string[] | null {
  const v = cookieValue?.trim();
  if (!v || v === "__all__") {
    return base;
  }
  if (!verifiedLocationId) {
    return base;
  }
  if (base === null) {
    return [verifiedLocationId];
  }
  if (base.length === 0) return base;
  return base.includes(verifiedLocationId) ? [verifiedLocationId] : base;
}

async function applyActiveVenueCookieToBase(
  base: string[] | null,
): Promise<string[] | null> {
  const jar = await cookies();
  const raw = jar.get(SCHEDULING_ACTIVE_VENUE_COOKIE)?.value;
  const v = raw?.trim();
  if (!v || v === "__all__") {
    return base;
  }
  const loc = await prisma.location.findUnique({
    where: { id: v },
    select: { id: true },
  });
  return resolveCookieAgainstBase(base, raw, loc?.id ?? null);
}

/**
 * Effective locations for scheduling and roster data after the venue switcher cookie.
 * `null` = full org. Empty array = no access.
 */
export async function getSchedulingLocationIdsForSession(
  session: Session,
): Promise<string[] | null> {
  const base = await getBaseSchedulingLocationIdsForSession(session);
  return applyActiveVenueCookieToBase(base);
}

/**
 * Whether an employee shares at least one venue with the session’s effective scheduling scope.
 * Matches manager roster visibility (`scope === null` = full org → allowed).
 */
export async function employeeOverlapsSchedulingScope(
  session: Session,
  employeeId: string,
): Promise<boolean> {
  const scope = await getSchedulingLocationIdsForSession(session);
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      locations: { select: { locationId: true } },
      departments: {
        select: { department: { select: { locationId: true } } },
      },
    },
  });
  if (!employee) return false;
  if (scope === null) return true;
  if (scope.length === 0) return false;
  const empVenues = new Set([
    ...employee.locations.map((l) => l.locationId),
    ...employee.departments.map((d) => d.department.locationId),
  ]);
  return [...empVenues].some((id) => scope.includes(id));
}

export type VenueSwitcherPayload = {
  locations: { id: string; name: string }[];
  selected: "__all__" | string;
};

function computeVenueUiSelection(
  base: string[] | null,
  effective: string[] | null,
): "__all__" | string {
  if (base === null) {
    if (effective === null) return "__all__";
    if (effective.length === 1) return effective[0];
    return "__all__";
  }
  if (effective === null || effective.length === 0) return "__all__";
  if (
    effective.length === base.length &&
    effective.every((id) => base.includes(id))
  ) {
    return "__all__";
  }
  if (effective.length === 1 && base.includes(effective[0])) {
    return effective[0];
  }
  return "__all__";
}

/**
 * When the user has more than one venue in scope, expose tabs + current selection.
 */
export async function getVenueSwitcherPayload(
  session: Session,
): Promise<VenueSwitcherPayload | null> {
  const base = await getBaseSchedulingLocationIdsForSession(session);
  let list: { id: string; name: string }[];
  if (base === null) {
    list = await prisma.location.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
  } else if (base.length <= 1) {
    return null;
  } else {
    list = await prisma.location.findMany({
      where: { id: { in: base } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
  }
  if (list.length <= 1) return null;

  const effective = await applyActiveVenueCookieToBase(base);
  const selected = computeVenueUiSelection(base, effective);
  return { locations: list, selected };
}

/** Shifts tied to these venues (by shift.location or department venue). */
export function shiftsWhereForLocations(
  locationIds: string[] | null,
): Prisma.ShiftWhereInput {
  if (locationIds === null) return {};
  if (locationIds.length === 0) return { id: { in: [] } };
  return {
    OR: [
      { locationId: { in: locationIds } },
      {
        AND: [
          { locationId: null },
          { department: { locationId: { in: locationIds } } },
        ],
      },
    ],
  };
}

export async function locationsVisibleToSession(
  session: Session,
): Promise<{ id: string; name: string; slug: string }[]> {
  const scope = await getSchedulingLocationIdsForSession(session);
  if (scope === null) {
    return prisma.location.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    });
  }
  if (scope.length === 0) return [];
  return prisma.location.findMany({
    where: { id: { in: scope } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });
}

export async function assertDepartmentsBelongToLocations(
  departmentIds: string[],
  locationIds: string[],
): Promise<boolean> {
  if (departmentIds.length === 0 || locationIds.length === 0) return false;
  const locSet = new Set(locationIds);
  const depts = await prisma.department.findMany({
    where: { id: { in: departmentIds } },
    select: { id: true, locationId: true },
  });
  const uniqueDept = [...new Set(departmentIds)];
  if (depts.length !== uniqueDept.length) return false;
  return depts.every((d) => locSet.has(d.locationId));
}

/** Effective venue for a shift (explicit location or department’s venue). */
export function shiftVenueId(shift: {
  locationId: string | null;
  department: { locationId: string };
}): string {
  return shift.locationId ?? shift.department.locationId;
}

export async function sessionMayAccessVenue(
  session: Session,
  venueId: string,
): Promise<boolean> {
  const scope = await getSchedulingLocationIdsForSession(session);
  if (scope === null) return true;
  return scope.includes(venueId);
}

/** Employee has a work location or department assignment at one of these venues. */
export function employeeTiedToLocationsWhere(
  locationIds: string[] | null,
): Prisma.EmployeeWhereInput {
  if (locationIds === null) return {};
  if (locationIds.length === 0) return { id: { in: [] } };
  return {
    OR: [
      { locations: { some: { locationId: { in: locationIds } } } },
      {
        departments: {
          some: { department: { locationId: { in: locationIds } } },
        },
      },
    ],
  };
}

/** Swap involves at least one shift at these venues (from and/or to leg). */
export function swapRequestTouchesLocationsWhere(
  locationIds: string[] | null,
): Prisma.SwapRequestWhereInput {
  if (locationIds === null) return {};
  if (locationIds.length === 0) return { id: { in: [] } };
  const shiftWhere = shiftsWhereForLocations(locationIds);
  return {
    OR: [
      { fromAssignment: { shift: shiftWhere } },
      { toAssignment: { shift: shiftWhere } },
    ],
  };
}

export async function sessionMayAccessSwapRequest(
  session: Session,
  swapId: string,
): Promise<boolean> {
  const scope = await getSchedulingLocationIdsForSession(session);
  if (scope === null) return true;
  if (scope.length === 0) return false;

  const swap = await prisma.swapRequest.findUnique({
    where: { id: swapId },
    include: {
      fromAssignment: {
        include: {
          shift: {
            select: {
              locationId: true,
              department: { select: { locationId: true } },
            },
          },
        },
      },
      toAssignment: {
        include: {
          shift: {
            select: {
              locationId: true,
              department: { select: { locationId: true } },
            },
          },
        },
      },
    },
  });
  if (!swap) return false;

  if (scope.includes(shiftVenueId(swap.fromAssignment.shift))) return true;
  if (swap.toAssignment) {
    return scope.includes(shiftVenueId(swap.toAssignment.shift));
  }
  return false;
}

export async function sessionMayAccessTimeOffRequest(
  session: Session,
  requestId: string,
): Promise<boolean> {
  const scope = await getSchedulingLocationIdsForSession(session);
  if (scope === null) return true;
  if (scope.length === 0) return false;

  const row = await prisma.timeOffRequest.findUnique({
    where: { id: requestId },
    select: { employeeId: true },
  });
  if (!row) return false;

  const count = await prisma.employee.count({
    where: {
      id: row.employeeId,
      ...employeeTiedToLocationsWhere(scope),
    },
  });
  return count > 0;
}

export async function syncManagerLocationsForUser(
  tx: Prisma.TransactionClient,
  userId: string,
  locationIds: string[],
): Promise<void> {
  await tx.managerLocation.deleteMany({ where: { userId } });
  if (locationIds.length === 0) return;
  await tx.managerLocation.createMany({
    data: locationIds.map((locationId) => ({ userId, locationId })),
    skipDuplicates: true,
  });
}
