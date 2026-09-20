-- Corrections /review 2026-09-10 sur l'intégration PayDunya.

-- 1. Stocke l'URL de paiement telle que renvoyée par PayDunya (l'hôte diffère
--    entre sandbox et prod — la reconstruire côté code était un bug).
ALTER TABLE "payments" ADD COLUMN "paydunyaCheckoutUrl" TEXT;

-- 2. Un seul Payment PAYDUNYA_API PENDING à la fois par échéance. Index unique
--    partiel (non exprimable dans schema.prisma) — même technique que
--    leases_tenant_active_unique / mandates_property_active_unique. Empêche
--    deux `initiate()` concurrents de créer deux factures PayDunya pour la
--    même échéance (le P2002 est capté et remappé en 409 dans initiate()).
CREATE UNIQUE INDEX "payments_schedule_entry_paydunya_pending_unique"
  ON "payments" ("scheduleEntryId")
  WHERE "source" = 'PAYDUNYA_API' AND "status" = 'PENDING';
