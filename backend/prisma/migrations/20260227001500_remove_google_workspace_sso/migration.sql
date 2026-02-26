-- Remove Google Workspace SSO artifacts now that Microsoft is the only provider.
ALTER TABLE "Organization"
  DROP COLUMN IF EXISTS "allowGoogleAuth",
  DROP COLUMN IF EXISTS "googleWorkspaceConnected",
  DROP COLUMN IF EXISTS "googleHostedDomain";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "googleSubject";

DROP INDEX IF EXISTS "Organization_googleHostedDomain_idx";
DROP INDEX IF EXISTS "User_googleSubject_key";

DELETE FROM "OrganizationOAuthConnection"
WHERE "provider" = 'google';
