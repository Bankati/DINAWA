-- CreateEnum
CREATE TYPE "ArtisanTrade" AS ENUM ('PLUMBER', 'ELECTRICIAN', 'MASON', 'CARPENTER', 'PAINTER', 'AIR_CONDITIONING', 'LOCKSMITH', 'GLAZIER', 'WELDER', 'TILER', 'OTHER');

-- CreateEnum
CREATE TYPE "ArtisanDirectoryStatus" AS ENUM ('PRIVATE', 'PUBLIC', 'REFUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SupportRequestStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportRequestUrgency" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportRequestChannel" AS ENUM ('WEB', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "InterventionCostPayer" AS ENUM ('OWNER', 'TENANT');

-- CreateTable
CREATE TABLE "artisans" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "trades" "ArtisanTrade"[],
    "zones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "directoryStatus" "ArtisanDirectoryStatus" NOT NULL DEFAULT 'PRIVATE',
    "consentChangedAt" TIMESTAMPTZ(6),
    "consentNoticeVersion" TEXT,
    "verifiedAt" TIMESTAMPTZ(6),
    "verifiedById" TEXT,
    "suspensionReason" TEXT,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "artisans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artisan_contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "privateNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artisan_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artisan_invitations" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artisan_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artisan_consent_events" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "previousStatus" "ArtisanDirectoryStatus" NOT NULL,
    "newStatus" "ArtisanDirectoryStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "noticeVersion" TEXT,
    "invitationId" TEXT,
    "actorUserId" TEXT,
    "phoneLast2" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artisan_consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "leaseId" TEXT,
    "tenantUserId" TEXT NOT NULL,
    "channel" "SupportRequestChannel" NOT NULL DEFAULT 'WEB',
    "description" TEXT NOT NULL,
    "trade" "ArtisanTrade",
    "urgency" "SupportRequestUrgency" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportRequestStatus" NOT NULL DEFAULT 'OPEN',
    "artisanId" TEXT,
    "assignedAt" TIMESTAMPTZ(6),
    "assignedById" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "resolvedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "costAmount" INTEGER,
    "costPaidBy" "InterventionCostPayer",
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_request_photos" (
    "id" TEXT NOT NULL,
    "supportRequestId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_request_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artisan_reviews" (
    "id" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "supportRequestId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "artisan_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artisans_phone_key" ON "artisans"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "artisans_userId_key" ON "artisans"("userId");

-- CreateIndex
CREATE INDEX "artisans_directoryStatus_idx" ON "artisans"("directoryStatus");

-- CreateIndex
CREATE INDEX "artisan_contacts_artisanId_idx" ON "artisan_contacts"("artisanId");

-- CreateIndex
CREATE UNIQUE INDEX "artisan_contacts_userId_artisanId_key" ON "artisan_contacts"("userId", "artisanId");

-- CreateIndex
CREATE INDEX "artisan_invitations_artisanId_createdAt_idx" ON "artisan_invitations"("artisanId", "createdAt");

-- CreateIndex
CREATE INDEX "artisan_consent_events_artisanId_createdAt_idx" ON "artisan_consent_events"("artisanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "support_requests_reference_key" ON "support_requests"("reference");

-- CreateIndex
CREATE INDEX "support_requests_propertyId_status_idx" ON "support_requests"("propertyId", "status");

-- CreateIndex
CREATE INDEX "support_requests_tenantUserId_createdAt_idx" ON "support_requests"("tenantUserId", "createdAt");

-- CreateIndex
CREATE INDEX "support_requests_artisanId_idx" ON "support_requests"("artisanId");

-- CreateIndex
CREATE INDEX "support_request_photos_supportRequestId_idx" ON "support_request_photos"("supportRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "artisan_reviews_supportRequestId_key" ON "artisan_reviews"("supportRequestId");

-- CreateIndex
CREATE INDEX "artisan_reviews_artisanId_idx" ON "artisan_reviews"("artisanId");

-- AddForeignKey
ALTER TABLE "artisans" ADD CONSTRAINT "artisans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisans" ADD CONSTRAINT "artisans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_contacts" ADD CONSTRAINT "artisan_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_contacts" ADD CONSTRAINT "artisan_contacts_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "artisans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_invitations" ADD CONSTRAINT "artisan_invitations_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "artisans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_invitations" ADD CONSTRAINT "artisan_invitations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_consent_events" ADD CONSTRAINT "artisan_consent_events_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "artisans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "artisans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_request_photos" ADD CONSTRAINT "support_request_photos_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "support_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_reviews" ADD CONSTRAINT "artisan_reviews_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "artisans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_reviews" ADD CONSTRAINT "artisan_reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_reviews" ADD CONSTRAINT "artisan_reviews_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "support_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

