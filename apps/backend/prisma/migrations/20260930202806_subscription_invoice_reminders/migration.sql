-- AlterTable
ALTER TABLE "subscription_invoices" ADD COLUMN     "reminder3SentAt" TIMESTAMPTZ(6),
ADD COLUMN     "reminder7SentAt" TIMESTAMPTZ(6);
