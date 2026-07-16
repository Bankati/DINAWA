-- Verso obligatoire à l'upload CNI (voir IdentityService.verify) : ajout du
-- stockage de l'image verso, de son texte OCR brut, de la ligne « Personne à
-- prévenir » extraite (nom + téléphone), et du signal MRZ (soft, non gate).
-- Colonnes nullables — aucun backfill nécessaire, rétrocompatible avec les
-- lignes existantes.
ALTER TABLE "identity_verifications"
  ADD COLUMN "storagePathBack" TEXT,
  ADD COLUMN "rawTextBack" TEXT,
  ADD COLUMN "emergencyContactRaw" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "mrzChecksumValid" BOOLEAN;
