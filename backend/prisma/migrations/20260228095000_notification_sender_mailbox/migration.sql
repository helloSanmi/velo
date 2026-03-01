-- Add org-level sender mailbox for outbound notifications/invites.
ALTER TABLE "Organization"
ADD COLUMN "notificationSenderEmail" TEXT;
