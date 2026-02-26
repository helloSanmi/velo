CREATE TYPE "TicketNotificationDeliveryStatus" AS ENUM ('queued', 'sent', 'failed', 'suppressed', 'dead_letter');
CREATE TYPE "TicketNotificationDeliveryKind" AS ENUM ('immediate', 'digest');

CREATE TABLE "TicketNotificationDelivery" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "kind" "TicketNotificationDeliveryKind" NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" "TicketNotificationDeliveryStatus" NOT NULL,
  "ticketId" TEXT,
  "recipientUserId" TEXT,
  "recipientEmail" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "payload" JSONB,
  "sentAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketNotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketNotificationDelivery_orgId_status_createdAt_idx"
  ON "TicketNotificationDelivery"("orgId", "status", "createdAt");
CREATE INDEX "TicketNotificationDelivery_orgId_kind_createdAt_idx"
  ON "TicketNotificationDelivery"("orgId", "kind", "createdAt");

ALTER TABLE "TicketNotificationDelivery"
  ADD CONSTRAINT "TicketNotificationDelivery_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
