-- Add explicit license state so seats can be assigned/revoked without deleting users.
ALTER TABLE "User"
ADD COLUMN "licenseActive" BOOLEAN NOT NULL DEFAULT true;
