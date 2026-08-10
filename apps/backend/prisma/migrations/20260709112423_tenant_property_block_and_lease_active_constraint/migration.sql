-- AlterTable
ALTER TABLE "identity_verifications" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "tenant_property_blocks" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantUserId" TEXT NOT NULL,
    "blockedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_property_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_property_blocks_tenantUserId_idx" ON "tenant_property_blocks"("tenantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_property_blocks_propertyId_tenantUserId_key" ON "tenant_property_blocks"("propertyId", "tenantUserId");

-- AddForeignKey
ALTER TABLE "tenant_property_blocks" ADD CONSTRAINT "tenant_property_blocks_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_property_blocks" ADD CONSTRAINT "tenant_property_blocks_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_property_blocks" ADD CONSTRAINT "tenant_property_blocks_blockedByUserId_fkey" FOREIGN KEY ("blockedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
