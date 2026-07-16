-- Références professionnelles uploadées à l'inscription gestionnaire
-- (voir build-plan.md unité 09) — tableau de chemins Storage, même
-- convention que zonesOfIntervention.
ALTER TABLE "manager_profiles"
  ADD COLUMN "referenceDocumentPaths" TEXT[] DEFAULT ARRAY[]::TEXT[];
