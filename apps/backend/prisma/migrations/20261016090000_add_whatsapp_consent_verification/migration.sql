-- Consentement WhatsApp, vérification du numéro et code locataire (phase 12,
-- unité 45, /architect 2026-10-16).
-- Migration purement additive : un type d'enum complété, deux nouveaux
-- types, des colonnes facultatives (ou avec valeur par défaut). Aucune donnée
-- existante n'est modifiée. Point important : whatsappVerifiedPhone est vide
-- pour tout le monde, donc personne n'est considéré comme vérifié — aucun
-- message ne peut partir tant que le locataire n'a pas écrit à WARAH.
--
-- Retour arrière : l'ancien code ne connaît pas la valeur PENDING et
-- planterait en lisant un utilisateur dans cet état. AVANT de redéployer
-- l'ancien code, exécuter :
--   UPDATE "users" SET "whatsappConsent" = 'NOT_ASKED' WHERE "whatsappConsent" = 'PENDING';
-- Les nouvelles colonnes et types peuvent rester : l'ancien code les ignore.

-- « Déclaré par l'agence, en attente du OUI du locataire ».
ALTER TYPE "WhatsappConsent" ADD VALUE 'PENDING' AFTER 'NOT_ASKED';

-- Nature d'une ligne d'historique et façon de recueillir l'accord.
CREATE TYPE "WhatsappConsentEventKind" AS ENUM ('CONSENT', 'PHONE_CHANGE');
CREATE TYPE "WhatsappConsentMethod" AS ENUM ('IN_PERSON', 'PHONE', 'WRITTEN');

-- Ordre des messages, demande d'accord en cours, numéro vérifié.
ALTER TABLE "users" ADD COLUMN     "whatsappConsentChangedAt" TIMESTAMPTZ(6),
ADD COLUMN     "whatsappConsentRequestExpiresAt" TIMESTAMPTZ(6),
ADD COLUMN     "whatsappConsentRequestId" TEXT,
ADD COLUMN     "whatsappPhoneVerifiedAt" TIMESTAMPTZ(6),
ADD COLUMN     "whatsappVerifiedPhone" TEXT;

-- Preuve du consentement.
ALTER TABLE "whatsapp_consent_events" ADD COLUMN     "collectionMethod" "WhatsappConsentMethod",
ADD COLUMN     "kind" "WhatsappConsentEventKind" NOT NULL DEFAULT 'CONSENT',
ADD COLUMN     "noticeVersion" TEXT,
ADD COLUMN     "phoneLast2" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "sourceAt" TIMESTAMPTZ(6);
