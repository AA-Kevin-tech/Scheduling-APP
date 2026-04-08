-- Departments belong to a single venue; managers get explicit venue access.

-- 1) Department.locationId (required)
ALTER TABLE "Department" ADD COLUMN "locationId" TEXT;

UPDATE "Department" SET "locationId" = (
  SELECT l.id FROM "Location" l ORDER BY l."sortOrder" ASC, l.id ASC LIMIT 1
) WHERE "locationId" IS NULL;

ALTER TABLE "Department" ALTER COLUMN "locationId" SET NOT NULL;

ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_slug_key";

CREATE UNIQUE INDEX "Department_locationId_slug_key" ON "Department"("locationId", "slug");

ALTER TABLE "Department" ADD CONSTRAINT "Department_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) Align shift pins with department venue
UPDATE "Shift" s
SET "locationId" = d."locationId"
FROM "Department" d
WHERE s."departmentId" = d.id
  AND (s."locationId" IS NULL OR s."locationId" IS DISTINCT FROM d."locationId");

-- 3) Manager venue access
CREATE TABLE "ManagerLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManagerLocation_userId_locationId_key" ON "ManagerLocation"("userId", "locationId");

ALTER TABLE "ManagerLocation" ADD CONSTRAINT "ManagerLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManagerLocation" ADD CONSTRAINT "ManagerLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ManagerLocation" ("id", "userId", "locationId", "createdAt")
SELECT md5(random()::text || u.id || el."locationId"), u.id, el."locationId", CURRENT_TIMESTAMP
FROM "User" u
INNER JOIN "Employee" e ON e."userId" = u.id
INNER JOIN "EmployeeLocation" el ON el."employeeId" = e.id
WHERE u."role" = 'MANAGER'
ON CONFLICT ("userId", "locationId") DO NOTHING;
