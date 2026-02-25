-- Extend OAuth provider enum for org integrations.
ALTER TYPE "OAuthProvider" ADD VALUE IF NOT EXISTS 'slack';
ALTER TYPE "OAuthProvider" ADD VALUE IF NOT EXISTS 'github';

-- Store provider-specific metadata (e.g. workspace/team/install ids).
ALTER TABLE "OrganizationOAuthConnection"
ADD COLUMN IF NOT EXISTS "metadata" JSONB;
