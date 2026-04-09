-- Allow multiple punch segments per shift assignment (e.g. lunch break).
DROP INDEX IF EXISTS "ShiftTimePunch_shiftAssignmentId_key";
CREATE INDEX "ShiftTimePunch_shiftAssignmentId_idx" ON "ShiftTimePunch"("shiftAssignmentId");
