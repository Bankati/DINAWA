-- Accord du locataire déjà inscrit (registre des décisions, 09/11/2026),
-- étape 1 sur 2 : deux valeurs ajoutées à l'enum LeaseStatus.
--
-- Migration séparée VOLONTAIREMENT : PostgreSQL refuse d'utiliser une valeur
-- d'enum ajoutée par ALTER TYPE ... ADD VALUE dans la transaction qui l'a
-- ajoutée (« unsafe use of new value »). Prisma applique chaque fichier de
-- migration en une fois : l'index partiel qui utilise 'PENDING_TENANT' est
-- donc dans la migration suivante (20261109120100_lease_confirmations),
-- appliquée après la validation de celle-ci.
--
-- Purement additive : aucune ligne existante n'utilise ces valeurs, aucune
-- donnée n'est modifiée.
--
-- Retour arrière : l'ancien code ne connaît pas ces deux valeurs. AVANT de
-- redéployer l'ancien code, vérifier qu'aucun bail n'est en attente :
--   SELECT count(*) FROM "leases" WHERE "status" IN ('PENDING_TENANT', 'CANCELLED');
-- (une valeur d'enum ne se retire pas ; elle peut rester, inutilisée.)

ALTER TYPE "LeaseStatus" ADD VALUE IF NOT EXISTS 'PENDING_TENANT';
ALTER TYPE "LeaseStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
