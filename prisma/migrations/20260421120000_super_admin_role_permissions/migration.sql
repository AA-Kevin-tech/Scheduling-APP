-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "feature" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_feature_key" ON "RolePermission"("role", "feature");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- Default: schedule editing allowed for all assignable roles (Super Admin bypasses in app code).
INSERT INTO "RolePermission" ("id", "role", "feature", "allowed", "updatedAt")
VALUES
  ('roleperm_seed_employee_sched', 'EMPLOYEE', 'scheduling_edit', true, CURRENT_TIMESTAMP),
  ('roleperm_seed_manager_sched', 'MANAGER', 'scheduling_edit', true, CURRENT_TIMESTAMP),
  ('roleperm_seed_admin_sched', 'ADMIN', 'scheduling_edit', true, CURRENT_TIMESTAMP),
  ('roleperm_seed_it_sched', 'IT', 'scheduling_edit', true, CURRENT_TIMESTAMP),
  ('roleperm_seed_payroll_sched', 'PAYROLL', 'scheduling_edit', true, CURRENT_TIMESTAMP);
