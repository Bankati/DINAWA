/*
  Warnings:

  - You are about to drop the `listing_contacts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "listing_contacts" DROP CONSTRAINT "listing_contacts_listingId_fkey";

-- DropTable
DROP TABLE "listing_contacts";
