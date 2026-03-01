ALTER TABLE IF EXISTS "TicketNotificationPolicy" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE IF EXISTS "TicketNotificationSuppression" ALTER COLUMN "updatedAt" DROP DEFAULT;
