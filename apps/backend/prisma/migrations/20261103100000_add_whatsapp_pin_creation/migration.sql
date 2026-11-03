-- Code locataire créé depuis WhatsApp (unité 50, /architect 2026-11-03).
-- Migration purement additive : deux états de conversation et une colonne
-- facultative. Aucune donnée existante n'est modifiée.
ALTER TYPE "WhatsappBotState" ADD VALUE 'AWAITING_NEW_PIN';
ALTER TYPE "WhatsappBotState" ADD VALUE 'AWAITING_NEW_PIN_CONFIRM';

-- Premier code tapé en message (secours sans formulaire), en attente de
-- confirmation : haché comme le code définitif, effacé à la réponse suivante.
ALTER TABLE "whatsapp_conversations" ADD COLUMN "pendingPinHash" TEXT;
