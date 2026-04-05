-- CreateTable
CREATE TABLE "ShiftTimePunch" (
    "id" TEXT NOT NULL,
    "shiftAssignmentId" TEXT NOT NULL,
    "clockInAt" TIMESTAMP(3) NOT NULL,
    "clockOutAt" TIMESTAMP(3),
    "clockInNote" TEXT,
    "clockOutNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTimePunch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTimePunch_shiftAssignmentId_key" ON "ShiftTimePunch"("shiftAssignmentId");

-- CreateIndex
CREATE INDEX "ShiftTimePunch_clockOutAt_idx" ON "ShiftTimePunch"("clockOutAt");

-- AddForeignKey
ALTER TABLE "ShiftTimePunch" ADD CONSTRAINT "ShiftTimePunch_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "ShiftAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
