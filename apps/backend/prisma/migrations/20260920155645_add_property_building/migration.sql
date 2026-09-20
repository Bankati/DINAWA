-- Regroupement d'immeuble (voir /architect 2026-09-20) — texte libre,
-- optionnel, aucune donnée existante affectée.
ALTER TABLE "properties" ADD COLUMN "building" TEXT;

CREATE INDEX "properties_building_idx" ON "properties" ("building");
