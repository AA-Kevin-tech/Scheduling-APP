-- CreateTable
CREATE TABLE "ScheduleAnnotation" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startsOnYmd" TEXT NOT NULL,
    "endsOnYmd" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "highlightHex" TEXT,
    "showAnnouncement" BOOLEAN NOT NULL DEFAULT true,
    "businessClosed" BOOLEAN NOT NULL DEFAULT false,
    "blockTimeOffRequests" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleAnnotation_locationId_idx" ON "ScheduleAnnotation"("locationId");

-- CreateIndex
CREATE INDEX "ScheduleAnnotation_startsOnYmd_endsOnYmd_idx" ON "ScheduleAnnotation"("startsOnYmd", "endsOnYmd");

-- AddForeignKey
ALTER TABLE "ScheduleAnnotation" ADD CONSTRAINT "ScheduleAnnotation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
