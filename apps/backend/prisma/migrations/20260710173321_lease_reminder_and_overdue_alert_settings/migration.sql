-- AlterTable
ALTER TABLE "leases" ADD COLUMN     "overdueAlertWindowDays" INTEGER,
ADD COLUMN     "reminderDaysBefore" INTEGER;
