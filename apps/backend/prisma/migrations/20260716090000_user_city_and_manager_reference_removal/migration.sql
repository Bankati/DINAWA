-- Ville de résidence — texte libre, sans logique métier attachée (voir
-- /architect révision inscription owner/manager). Pas de contrainte NOT NULL
-- au niveau base : la colonne reste nullable, l'obligation est portée par
-- les DTOs de signup uniquement.
ALTER TABLE "users"
  ADD COLUMN "city" TEXT;

-- Document PDF du gestionnaire jugé non indispensable et retiré du flux
-- d'inscription (voir /architect) — sa seule vocation prévue (crédibilité
-- sur un futur profil public, Phase 8 non construite) n'a jamais eu de
-- consommateur dans le produit.
ALTER TABLE "manager_profiles"
  DROP COLUMN "referenceDocumentPaths";
