-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "readAt" TIMESTAMPTZ(6);

-- Rétro-remplissage : les notifications déjà en base au moment de cette
-- migration sont considérées comme déjà lues (readAt = createdAt) — sans
-- ça, tout l'historique apparaîtrait comme "non lu" au premier déploiement
-- du popover de notifications.
UPDATE "notifications" SET "readAt" = "createdAt" WHERE "readAt" IS NULL;
