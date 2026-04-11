-- AlterTable
ALTER TABLE "Location" ADD COLUMN "geofenceLatitude" DECIMAL(10,7),
ADD COLUMN "geofenceLongitude" DECIMAL(10,7),
ADD COLUMN "geofenceRadiusFeet" DECIMAL(12,2);
