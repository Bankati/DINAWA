-- Code locataire créé depuis WhatsApp (unité 50, /architect 2026-11-03).
-- Migration purement additive : trois états de conversation et deux
-- colonnes (facultative, ou avec valeur par défaut). Aucune donnée existante
-- n'est modifiée.
ALTER TYPE "WhatsappBotState" ADD VALUE 'AWAITING_NEW_PIN';
ALTER TYPE "WhatsappBotState" ADD VALUE 'AWAITING_NEW_PIN_CONFIRM';
ALTER TYPE "WhatsappBotState" ADD VALUE 'AWAITING_RENT_CHECK';

-- Premier code tapé en message (secours sans formulaire), en attente de
-- confirmation : haché comme le code définitif, effacé à la réponse suivante.
ALTER TABLE "whatsapp_conversations" ADD COLUMN "pendingPinHash" TEXT;

-- Blocages successifs du code (24 h à partir du 3e au lieu d'1 h).
ALTER TABLE "tenant_profiles" ADD COLUMN "pinLockCount" INTEGER NOT NULL DEFAULT 0;
