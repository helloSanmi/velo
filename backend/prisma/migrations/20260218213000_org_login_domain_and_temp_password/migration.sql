ALTER TABLE "Organization"
ADD COLUMN "loginSubdomain" TEXT NOT NULL DEFAULT 'workspace',
ADD COLUMN "allowGoogleAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allowMicrosoftAuth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "googleWorkspaceConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "microsoftWorkspaceConnected" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS seq
  FROM "Organization"
)
UPDATE "Organization" o
SET "loginSubdomain" = CONCAT('org-', ranked.seq)
FROM ranked
WHERE o.id = ranked.id;

CREATE UNIQUE INDEX "Organization_loginSubdomain_key" ON "Organization"("loginSubdomain");
