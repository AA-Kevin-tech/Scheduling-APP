-- One non-null time clock PIN digest per employee (kiosk); multiple NULLs remain allowed.
DROP INDEX IF EXISTS "Employee_timeClockPinLookup_idx";
CREATE UNIQUE INDEX "Employee_timeClockPinLookup_key" ON "Employee"("timeClockPinLookup");
