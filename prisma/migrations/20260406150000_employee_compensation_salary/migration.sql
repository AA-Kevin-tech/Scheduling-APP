-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('HOURLY', 'SALARY');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "compensationType" "CompensationType" NOT NULL DEFAULT 'HOURLY',
ADD COLUMN     "annualSalary" DECIMAL(12,2);
