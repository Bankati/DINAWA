-- Ajoute le forfait "Agence" (20 000 FCFA/mois, biens illimites) a l'enum
-- SubscriptionTier. Ajout pur (ALTER TYPE ... ADD VALUE) : aucune donnee
-- existante n'est affectee, aucune ligne ne reference encore cette valeur.
ALTER TYPE "SubscriptionTier" ADD VALUE 'AGENCE';
