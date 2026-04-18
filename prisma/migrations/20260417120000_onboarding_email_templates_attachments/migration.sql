-- CreateTable
CREATE TABLE "OnboardingEmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "OnboardingEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeInviteAttachment" (
    "id" TEXT NOT NULL,
    "employeeInviteId" TEXT NOT NULL,
    "docKey" TEXT,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeInviteAttachment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "EmployeeInvite" ADD COLUMN     "emailTemplateId" TEXT,
ADD COLUMN     "onboardingDocSelections" JSONB;

-- CreateIndex
CREATE INDEX "OnboardingEmailTemplate_name_idx" ON "OnboardingEmailTemplate"("name");

-- CreateIndex
CREATE INDEX "EmployeeInvite_emailTemplateId_idx" ON "EmployeeInvite"("emailTemplateId");

-- CreateIndex
CREATE INDEX "EmployeeInviteAttachment_employeeInviteId_idx" ON "EmployeeInviteAttachment"("employeeInviteId");

-- AddForeignKey
ALTER TABLE "OnboardingEmailTemplate" ADD CONSTRAINT "OnboardingEmailTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInvite" ADD CONSTRAINT "EmployeeInvite_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "OnboardingEmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInviteAttachment" ADD CONSTRAINT "EmployeeInviteAttachment_employeeInviteId_fkey" FOREIGN KEY ("employeeInviteId") REFERENCES "EmployeeInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
