-- Ajout d'un suivi updatedAt sur IdentityVerification (transition
-- PENDING -> VERIFIED/REJECTED par IdentityVerificationListener).
ALTER TABLE "identity_verifications"
  ADD COLUMN "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Contrainte non exprimable dans prisma/schema.prisma : Prisma ne supporte
-- pas les index uniques partiels (WHERE ...). Voir le commentaire sur le
-- modèle IdentityVerification. Garantit qu'un utilisateur ne peut pas avoir
-- deux vérifications CNI en cours simultanément (invariant #15 : l'OCR
-- tourne en arrière-plan, jamais dans le request handler).
CREATE UNIQUE INDEX "identity_verifications_user_pending_unique"
  ON "identity_verifications" ("userId")
  WHERE "status" = 'PENDING';
