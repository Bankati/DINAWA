-- Webhook Meta (phase 12, unité 44, /architect 2026-10-13).
-- Migration purement additive : nouvelles valeurs d'enum et colonnes
-- facultatives (ou avec valeur par défaut). Aucune donnée existante n'est
-- modifiée. Supabase tourne sous PostgreSQL 15 : plusieurs ADD VALUE dans
-- une même migration sont acceptés.

-- Types des messages reçus (OTHER = localisation, contact, réaction...).
ALTER TYPE "WhatsappMessageType" ADD VALUE 'INTERACTIVE';
ALTER TYPE "WhatsappMessageType" ADD VALUE 'IMAGE';
ALTER TYPE "WhatsappMessageType" ADD VALUE 'AUDIO';
ALTER TYPE "WhatsappMessageType" ADD VALUE 'VIDEO';
ALTER TYPE "WhatsappMessageType" ADD VALUE 'OTHER';

-- Statut d'un message entrant.
ALTER TYPE "WhatsappMessageStatus" ADD VALUE 'RECEIVED';

-- Accusés « livré » / « lu », texte reçu effaçable, liste de travail durable.
ALTER TABLE "whatsapp_messages" ADD COLUMN     "body" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMPTZ(6),
ADD COLUMN     "inboundAction" TEXT,
ADD COLUMN     "processedAt" TIMESTAMPTZ(6),
ADD COLUMN     "processingAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingStartedAt" TIMESTAMPTZ(6),
ADD COLUMN     "readAt" TIMESTAMPTZ(6);

-- Tâche de rattrapage : messages entrants non traités, les plus anciens d'abord.
CREATE INDEX "whatsapp_messages_direction_processedAt_createdAt_idx" ON "whatsapp_messages"("direction", "processedAt", "createdAt");
