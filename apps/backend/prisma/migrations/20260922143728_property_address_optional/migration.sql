-- Adresse d'un bien devenue optionnelle (voir /recover 2026-09-22) — retrait
-- de la contrainte NOT NULL uniquement, aucune donnée existante affectée.
ALTER TABLE "properties" ALTER COLUMN "address" DROP NOT NULL;
