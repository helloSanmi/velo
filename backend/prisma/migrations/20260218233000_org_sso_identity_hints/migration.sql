ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "googleHostedDomain" TEXT,
  ADD COLUMN IF NOT EXISTS "microsoftTenantId" TEXT;

CREATE INDEX IF NOT EXISTS "Organization_googleHostedDomain_idx" ON "Organization"("googleHostedDomain");
CREATE INDEX IF NOT EXISTS "Organization_microsoftTenantId_idx" ON "Organization"("microsoftTenantId");
