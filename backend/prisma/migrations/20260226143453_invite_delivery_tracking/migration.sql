-- Add invite email delivery tracking fields for Phase 3 onboarding.
ALTER TABLE "Invite"
ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "deliveryProvider" "OAuthProvider",
ADD COLUMN IF NOT EXISTS "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "deliveryLastAttemptAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deliveryDeliveredAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deliveryError" TEXT;
