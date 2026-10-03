-- AlterEnum
-- Ajoute les types de biens du marché locatif togolais — purement additif,
-- aucune valeur existante (VILLA/APARTMENT/STUDIO/COMMERCIAL) n'est
-- renommée ni supprimée.
ALTER TYPE "PropertyType" ADD VALUE 'CHAMBRE_SIMPLE';
ALTER TYPE "PropertyType" ADD VALUE 'CHAMBRE_SALON';
ALTER TYPE "PropertyType" ADD VALUE 'DEUX_CHAMBRES_SALON';
ALTER TYPE "PropertyType" ADD VALUE 'TROIS_CHAMBRES_SALON';
ALTER TYPE "PropertyType" ADD VALUE 'VILLA_DUPLEX';
ALTER TYPE "PropertyType" ADD VALUE 'APPARTEMENT_MEUBLE';
