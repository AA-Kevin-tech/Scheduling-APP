-- The original schema used CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug").
-- Per-venue uniqueness is enforced by "Department_locationId_slug_key" (locationId + slug).
-- The 20260408140000 migration used DROP CONSTRAINT for "Department_slug_key", but a
-- standalone UNIQUE INDEX is not a table constraint, so the old global index may still exist
-- and block the same slug at different venues. Drop it explicitly.

DROP INDEX IF EXISTS "Department_slug_key";
