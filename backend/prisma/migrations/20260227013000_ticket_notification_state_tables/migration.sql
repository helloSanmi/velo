CREATE TABLE IF NOT EXISTS "TicketNotificationPolicy" (
  "id" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL UNIQUE,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursStartHour" INTEGER NOT NULL DEFAULT 22,
  "quietHoursEndHour" INTEGER NOT NULL DEFAULT 7,
  "timezoneOffsetMinutes" INTEGER NOT NULL DEFAULT 0,
  "channels" JSONB NOT NULL,
  "events" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TicketNotificationSuppression" (
  "id" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "suppressionKey" TEXT NOT NULL,
  "lastSentAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketNotificationSuppression_orgId_suppressionKey_key" UNIQUE ("orgId", "suppressionKey")
);

CREATE TABLE IF NOT EXISTS "TicketInboundMessageState" (
  "id" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "messageKey" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketInboundMessageState_orgId_messageKey_key" UNIQUE ("orgId", "messageKey")
);

CREATE INDEX IF NOT EXISTS "TicketNotificationPolicy_orgId_updatedAt_idx"
  ON "TicketNotificationPolicy"("orgId", "updatedAt");
CREATE INDEX IF NOT EXISTS "TicketNotificationSuppression_orgId_lastSentAt_idx"
  ON "TicketNotificationSuppression"("orgId", "lastSentAt");
CREATE INDEX IF NOT EXISTS "TicketInboundMessageState_orgId_seenAt_idx"
  ON "TicketInboundMessageState"("orgId", "seenAt");

ALTER TABLE "TicketNotificationPolicy"
  ADD CONSTRAINT "TicketNotificationPolicy_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketNotificationSuppression"
  ADD CONSTRAINT "TicketNotificationSuppression_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketInboundMessageState"
  ADD CONSTRAINT "TicketInboundMessageState_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
