-- DropForeignKey
ALTER TABLE "payout_accounts" DROP CONSTRAINT "payout_accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "payout_account_changes" DROP CONSTRAINT "payout_account_changes_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "payoutOperator" "PayoutOperator";

-- DropTable
DROP TABLE "payout_accounts";

-- DropTable
DROP TABLE "payout_account_changes";

