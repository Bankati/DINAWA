-- CreateEnum
CREATE TYPE "WhatsappConsent" AS ENUM ('NOT_ASKED', 'ACCEPTED', 'STOPPED');

-- CreateEnum
CREATE TYPE "WhatsappConsentSource" AS ENUM ('AGENCY', 'BOT', 'TENANT_PORTAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "WhatsappDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "WhatsappMessageType" AS ENUM ('TEMPLATE', 'TEXT', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "WhatsappMessageStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'UNKNOWN');

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "whatsappEnabledTiers" "SubscriptionTier"[] DEFAULT ARRAY['STARTER', 'PRO', 'PREMIUM']::"SubscriptionTier"[];

-- AlterTable
ALTER TABLE "tenant_profiles" ADD COLUMN     "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinLockedUntil" TIMESTAMPTZ(6),
ADD COLUMN     "whatsappPinHash" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "whatsappConsent" "WhatsappConsent" NOT NULL DEFAULT 'NOT_ASKED',
ADD COLUMN     "whatsappConsentAt" TIMESTAMPTZ(6),
ADD COLUMN     "whatsappConsentById" TEXT,
ADD COLUMN     "whatsappPhone" TEXT,
ADD COLUMN     "whatsappStoppedAt" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "direction" "WhatsappDirection" NOT NULL,
    "messageType" "WhatsappMessageType" NOT NULL,
    "templateName" TEXT,
    "source" TEXT NOT NULL,
    "status" "WhatsappMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "wamid" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "scheduleEntryId" TEXT,
    "paymentId" TEXT,
    "sentAt" TIMESTAMPTZ(6),
    "failedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_consent_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousConsent" "WhatsappConsent" NOT NULL,
    "newConsent" "WhatsappConsent" NOT NULL,
    "source" "WhatsappConsentSource" NOT NULL,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_wamid_key" ON "whatsapp_messages"("wamid");

-- CreateIndex
CREATE INDEX "whatsapp_messages_status_createdAt_idx" ON "whatsapp_messages"("status", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_userId_createdAt_idx" ON "whatsapp_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_consent_events_userId_createdAt_idx" ON "whatsapp_consent_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_whatsappPhone_key" ON "users"("whatsappPhone");

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_scheduleEntryId_fkey" FOREIGN KEY ("scheduleEntryId") REFERENCES "payment_schedule_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_consent_events" ADD CONSTRAINT "whatsapp_consent_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_consent_events" ADD CONSTRAINT "whatsapp_consent_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

