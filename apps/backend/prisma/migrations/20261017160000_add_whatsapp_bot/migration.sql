-- Robot à menu WhatsApp (phase 12, unité 47, /architect 2026-10-17).
-- Migration purement additive : deux types, colonnes facultatives, une
-- nouvelle table. Aucune donnée existante n'est modifiée.

-- État de la conversation et actions protégées par le code.
CREATE TYPE "WhatsappBotState" AS ENUM ('MENU', 'AWAITING_PIN');
CREATE TYPE "WhatsappBotAction" AS ENUM ('RECEIPT', 'STATEMENT');

-- Invitation « répondez OUI » (une par 24 h au plus).
ALTER TABLE "users" ADD COLUMN     "whatsappInvitedAt" TIMESTAMPTZ(6);

-- Vérification du code locataire par le robot (30 jours, liée au numéro).
ALTER TABLE "tenant_profiles" ADD COLUMN     "pinVerifiedAt" TIMESTAMPTZ(6),
ADD COLUMN     "pinVerifiedPhone" TEXT;

-- Preuve d'un accord donné en réponse à l'invitation du robot.
ALTER TABLE "whatsapp_consent_events" ADD COLUMN     "invitedAt" TIMESTAMPTZ(6);

-- Conversation d'un locataire avec le robot.
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" "WhatsappBotState" NOT NULL DEFAULT 'MENU',
    "pendingAction" "WhatsappBotAction",
    "lastActivityAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyWindowStart" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_conversations_userId_key" ON "whatsapp_conversations"("userId");

ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
