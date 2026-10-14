-- Ajoute 3 categories de biens a l'enum PropertyType : Magasin, Boutique et
-- Villa meublee. Ajout pur (ALTER TYPE ... ADD VALUE) : aucune donnee
-- existante n'est affectee, aucune ligne ne reference encore ces valeurs.
ALTER TYPE "PropertyType" ADD VALUE 'VILLA_MEUBLEE';
ALTER TYPE "PropertyType" ADD VALUE 'MAGASIN';
ALTER TYPE "PropertyType" ADD VALUE 'BOUTIQUE';
