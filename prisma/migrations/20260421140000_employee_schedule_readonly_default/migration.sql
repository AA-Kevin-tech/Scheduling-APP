-- Align default with product: login role Employee does not edit the manager schedule grid.
UPDATE "RolePermission"
SET "allowed" = false
WHERE "role" = 'EMPLOYEE' AND "feature" = 'scheduling_edit';
