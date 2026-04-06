-- AlterTable
ALTER TABLE "Shift" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Existing shifts were already visible to employees; treat as published.
UPDATE "Shift" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;
