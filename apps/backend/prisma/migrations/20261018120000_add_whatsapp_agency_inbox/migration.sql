-- CreateEnum
CREATE TYPE "WhatsappThreadCloseReason" AS ENUM ('AGENCY', 'TENANT', 'TIMEOUT', 'STOP', 'SYSTEM');

-- AlterEnum
ALTER TYPE "WhatsappBotState" ADD VALUE 'HUMAN';

-- AlterTable
ALTER TABLE "whatsapp_messages" ADD COLUMN     "sentByUserId" TEXT,
ADD COLUMN     "threadId" TEXT;

-- AlterTable
ALTER TABLE "whatsapp_conversations" ADD COLUMN     "humanThreadId" TEXT;

-- CreateTable
CREATE TABLE "whatsapp_threads" (
    "id" TEXT NOT NULL,
    "tenantUserId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "humanOpenedAt" TIMESTAMPTZ(6),
    "humanClosedAt" TIMESTAMPTZ(6),
    "closedReason" "WhatsappThreadCloseReason",
    "lastTenantMessageAt" TIMESTAMPTZ(6),
    "lastMessageAt" TIMESTAMPTZ(6),
    "unreadSince" TIMESTAMPTZ(6),
    "agencyReadAt" TIMESTAMPTZ(6),
    "agencyReadById" TEXT,
    "notifiedAt" TIMESTAMPTZ(6),
    "notifiedUserId" TEXT,
    "mediaNoticeSentAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "whatsapp_threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_threads_propertyId_lastMessageAt_idx" ON "whatsapp_threads"("propertyId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_threads_tenantUserId_propertyId_key" ON "whatsapp_threads"("tenantUserId", "propertyId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_threadId_createdAt_idx" ON "whatsapp_messages"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "whatsapp_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_humanThreadId_fkey" FOREIGN KEY ("humanThreadId") REFERENCES "whatsapp_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_threads" ADD CONSTRAINT "whatsapp_threads_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_threads" ADD CONSTRAINT "whatsapp_threads_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

