import type { Prisma } from "@prisma/client";
import type { ScheduleAnnotationDTO } from "@/lib/schedule/annotations";
import { prisma } from "@/lib/db";

export type ScheduleAnnotationWithLocation = Prisma.ScheduleAnnotationGetPayload<{
  include: { location: { select: { name: true } } };
}>;

/**
 * Annotations whose YMD range overlaps [rangeStartYmd, rangeEndYmd] inclusive.
 * `locationIds === null` = all locations (org-wide schedulers).
 */
export async function listScheduleAnnotationsOverlappingYmdRange(
  locationIds: string[] | null,
  rangeStartYmd: string,
  rangeEndYmd: string,
): Promise<ScheduleAnnotationWithLocation[]> {
  if (locationIds !== null && locationIds.length === 0) {
    return [];
  }
  const where: Prisma.ScheduleAnnotationWhereInput = {
    startsOnYmd: { lte: rangeEndYmd },
    endsOnYmd: { gte: rangeStartYmd },
    ...(locationIds ? { locationId: { in: locationIds } } : {}),
  };
  return prisma.scheduleAnnotation.findMany({
    where,
    include: { location: { select: { name: true } } },
    orderBy: [{ startsOnYmd: "asc" }, { title: "asc" }],
  });
}

export function annotationTouchesDay(
  row: Pick<ScheduleAnnotationWithLocation, "startsOnYmd" | "endsOnYmd">,
  dayYmd: string,
): boolean {
  return dayYmd >= row.startsOnYmd && dayYmd <= row.endsOnYmd;
}

export function toScheduleAnnotationDto(
  row: ScheduleAnnotationWithLocation,
): ScheduleAnnotationDTO {
  return {
    id: row.id,
    locationId: row.locationId,
    locationName: row.location.name,
    startsOnYmd: row.startsOnYmd,
    endsOnYmd: row.endsOnYmd,
    title: row.title,
    message: row.message,
    highlightHex: row.highlightHex,
    showAnnouncement: row.showAnnouncement,
    businessClosed: row.businessClosed,
    blockTimeOffRequests: row.blockTimeOffRequests,
  };
}
