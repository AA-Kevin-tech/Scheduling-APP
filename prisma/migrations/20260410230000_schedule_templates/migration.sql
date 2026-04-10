-- CreateTable
CREATE TABLE "ScheduleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplateShift" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "startHm" TEXT NOT NULL,
    "endHm" TEXT NOT NULL,
    "endDayOffset" INTEGER NOT NULL DEFAULT 0,
    "departmentId" TEXT NOT NULL,
    "locationId" TEXT,
    "roleId" TEXT,
    "zoneId" TEXT,
    "title" TEXT,

    CONSTRAINT "ScheduleTemplateShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplateShiftAssignment" (
    "id" TEXT NOT NULL,
    "templateShiftId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "ScheduleTemplateShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleTemplate_name_idx" ON "ScheduleTemplate"("name");

-- CreateIndex
CREATE INDEX "ScheduleTemplateShift_templateId_idx" ON "ScheduleTemplateShift"("templateId");

-- CreateIndex
CREATE INDEX "ScheduleTemplateShiftAssignment_templateShiftId_idx" ON "ScheduleTemplateShiftAssignment"("templateShiftId");

-- AddForeignKey
ALTER TABLE "ScheduleTemplate" ADD CONSTRAINT "ScheduleTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateShift" ADD CONSTRAINT "ScheduleTemplateShift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScheduleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateShift" ADD CONSTRAINT "ScheduleTemplateShift_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateShift" ADD CONSTRAINT "ScheduleTemplateShift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateShift" ADD CONSTRAINT "ScheduleTemplateShift_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateShift" ADD CONSTRAINT "ScheduleTemplateShift_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DepartmentZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateShiftAssignment" ADD CONSTRAINT "ScheduleTemplateShiftAssignment_templateShiftId_fkey" FOREIGN KEY ("templateShiftId") REFERENCES "ScheduleTemplateShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateShiftAssignment" ADD CONSTRAINT "ScheduleTemplateShiftAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
