-- Invalidate JWTs after password change by bumping version (see auth.ts jwt callback).
ALTER TABLE "User" ADD COLUMN "credentialVersion" INTEGER NOT NULL DEFAULT 0;
