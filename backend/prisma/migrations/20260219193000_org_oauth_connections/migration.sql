-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('google', 'microsoft');

-- CreateTable
CREATE TABLE "OrganizationOAuthConnection" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "provider" "OAuthProvider" NOT NULL,
  "accessToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshToken" TEXT,
  "scope" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationOAuthConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOAuthConnection_orgId_provider_key" ON "OrganizationOAuthConnection"("orgId", "provider");

-- CreateIndex
CREATE INDEX "OrganizationOAuthConnection_orgId_provider_idx" ON "OrganizationOAuthConnection"("orgId", "provider");

-- AddForeignKey
ALTER TABLE "OrganizationOAuthConnection"
ADD CONSTRAINT "OrganizationOAuthConnection_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
