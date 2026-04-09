-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "timeClockPinLookup" TEXT;
CREATE INDEX "Employee_timeClockPinLookup_idx" ON "Employee"("timeClockPinLookup");
