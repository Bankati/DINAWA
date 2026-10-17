-- Canal WhatsApp dans les notifications (phase 12, unité 46, /architect
-- 2026-10-16). Colonnes facultatives ou avec valeur par défaut.

-- Relance unique du locataire en retard.
ALTER TABLE "payment_schedule_entries" ADD COLUMN     "tenantOverdueSentAt" TIMESTAMPTZ(6);

-- Les retards DÉJÀ signalés à l'agence avant cette unité sont considérés
-- comme traités pour le locataire aussi : sinon, au premier passage de la
-- tâche, tous les locataires en retard des 90 derniers jours recevraient
-- d'un coup une relance pour un vieil impayé. Seule la nouvelle colonne
-- est écrite ; aucune donnée existante n'est modifiée.
UPDATE "payment_schedule_entries"
SET "tenantOverdueSentAt" = "overdueAlertSentAt"
WHERE "overdueAlertSentAt" IS NOT NULL;

-- Nouveaux essais d'un envoi WhatsApp (3 tentatives au total, une heure
-- au plus depuis la première).
ALTER TABLE "whatsapp_messages" ADD COLUMN     "attempt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "firstAttemptAt" TIMESTAMPTZ(6);
