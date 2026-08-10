-- AlterTable
ALTER TABLE "payment_declarations" ADD COLUMN     "reminder3SentAt" TIMESTAMPTZ(6),
ADD COLUMN     "reminder7SentAt" TIMESTAMPTZ(6);
