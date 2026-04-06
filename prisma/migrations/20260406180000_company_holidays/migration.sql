-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "holidayPayEligible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CompanyHoliday" (
    "id" TEXT NOT NULL,
    "holidayDateYmd" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workPremiumMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "paidAbsenceHours" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyHoliday_holidayDateYmd_key" ON "CompanyHoliday"("holidayDateYmd");

-- CreateIndex
CREATE INDEX "CompanyHoliday_holidayDateYmd_idx" ON "CompanyHoliday"("holidayDateYmd");
