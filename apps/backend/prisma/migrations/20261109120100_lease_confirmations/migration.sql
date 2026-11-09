-- Accord du locataire déjà inscrit (registre des décisions, 09/11/2026),
-- étape 2 sur 2 : la demande de confirmation et ses index.
--
-- Purement additive : deux nouveaux types, une nouvelle table, des index.
-- Aucune colonne existante n'est modifiée, renommée ni supprimée. Les deux
-- index partiels portent sur des valeurs qu'aucune ligne n'utilise encore :
-- leur création ne peut pas échouer sur des données existantes.
--
-- Écrite sans connexion à une base (prisma migrate diff entre l'ancien et le
-- nouveau schéma, plus les index partiels que Prisma ne sait pas décrire).
--
-- Retour arrière : l'ancien code ignore cette table ; elle peut rester.

-- CreateEnum
CREATE TYPE "LeaseConfirmationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaseConfirmationChannel" AS ENUM ('APP', 'WHATSAPP');

-- CreateTable
CREATE TABLE "lease_confirmations" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantUserId" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "typedFirstName" TEXT NOT NULL,
    "typedLastName" TEXT NOT NULL,
    "typedPhone" TEXT NOT NULL,
    "typedEmail" TEXT NOT NULL,
    "status" "LeaseConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMPTZ(6) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "reminder1SentAt" TIMESTAMPTZ(6),
    "reminder2SentAt" TIMESTAMPTZ(6),
    "whatsappSentAt" TIMESTAMPTZ(6),
    "respondedAt" TIMESTAMPTZ(6),
    "respondedVia" "LeaseConfirmationChannel",
    "previousPropertyStatus" "PropertyStatus" NOT NULL,
    "listingWasActive" BOOLEAN NOT NULL,
    "resentAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lease_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lease_confirmations_leaseId_idx" ON "lease_confirmations"("leaseId");

-- CreateIndex
CREATE INDEX "lease_confirmations_propertyId_idx" ON "lease_confirmations"("propertyId");

-- CreateIndex
CREATE INDEX "lease_confirmations_tenantUserId_status_idx" ON "lease_confirmations"("tenantUserId", "status");

-- CreateIndex
CREATE INDEX "lease_confirmations_inviterUserId_tenantUserId_status_idx" ON "lease_confirmations"("inviterUserId", "tenantUserId", "status");

-- CreateIndex
CREATE INDEX "lease_confirmations_status_expiresAt_idx" ON "lease_confirmations"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "lease_confirmations" ADD CONSTRAINT "lease_confirmations_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_confirmations" ADD CONSTRAINT "lease_confirmations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_confirmations" ADD CONSTRAINT "lease_confirmations_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_confirmations" ADD CONSTRAINT "lease_confirmations_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index partiels (non exprimables dans schema.prisma, voir les commentaires
-- des modèles Lease et LeaseConfirmation) :

-- Le bien est réservé pendant l'attente : un seul bail en attente par bien.
-- Utilise 'PENDING_TENANT', ajouté par la migration précédente (déjà validée).
CREATE UNIQUE INDEX "leases_property_pending_unique"
  ON "leases" ("propertyId")
  WHERE "status" = 'PENDING_TENANT';

-- Une seule demande en cours par bail.
CREATE UNIQUE INDEX "lease_confirmations_lease_pending_unique"
  ON "lease_confirmations" ("leaseId")
  WHERE "status" = 'PENDING';
