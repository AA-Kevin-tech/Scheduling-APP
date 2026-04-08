-- CreateEnum
CREATE TYPE "EmployeeInviteStage" AS ENUM ('INVITED', 'STARTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "EmployeeInvite" ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "stage" "EmployeeInviteStage" NOT NULL DEFAULT 'INVITED';

-- Backfill completed invites
UPDATE "EmployeeInvite" SET "stage" = 'COMPLETED' WHERE "consumedAt" IS NOT NULL;

-- CreateIndex
CREATE INDEX "EmployeeInvite_stage_idx" ON "EmployeeInvite"("stage");
