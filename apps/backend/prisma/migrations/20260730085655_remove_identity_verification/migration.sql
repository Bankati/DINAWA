/*
  Warnings:

  - You are about to drop the column `idVerificationStatus` on the `manager_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `idVerificationStatus` on the `owner_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `idVerificationStatus` on the `tenant_profiles` table. All the data in the column will be lost.
  - You are about to drop the `identity_verifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "identity_verifications" DROP CONSTRAINT "identity_verifications_userId_fkey";

-- AlterTable
ALTER TABLE "manager_profiles" DROP COLUMN "idVerificationStatus";

-- AlterTable
ALTER TABLE "owner_profiles" DROP COLUMN "idVerificationStatus";

-- AlterTable
ALTER TABLE "tenant_profiles" DROP COLUMN "idVerificationStatus";

-- DropTable
DROP TABLE "identity_verifications";

-- DropEnum
DROP TYPE "IdVerificationStatus";
