-- DropIndex
DROP INDEX "Organization_googleHostedDomain_idx";

-- DropIndex
DROP INDEX "Organization_microsoftTenantId_idx";

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "loginSubdomain" DROP DEFAULT;
