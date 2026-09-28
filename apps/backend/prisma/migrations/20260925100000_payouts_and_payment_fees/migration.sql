-- CreateEnum
CREATE TYPE "PayoutOperator" AS ENUM ('TMONEY', 'FLOOZ');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "beneficiaryUserId" TEXT,
ADD COLUMN     "feeAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "payout_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operator" "PayoutOperator" NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_account_changes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousOperator" "PayoutOperator",
    "previousPhone" TEXT,
    "newOperator" "PayoutOperator" NOT NULL,
    "newPhone" TEXT NOT NULL,
    "changedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_account_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "beneficiaryUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "operator" "PayoutOperator",
    "phone" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disburseToken" TEXT,
    "transactionId" TEXT,
    "providerFee" INTEGER,
    "lastError" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payout_accounts_userId_key" ON "payout_accounts"("userId");

-- CreateIndex
CREATE INDEX "payout_account_changes_userId_idx" ON "payout_account_changes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_paymentId_key" ON "payouts"("paymentId");

-- CreateIndex
CREATE INDEX "payouts_status_nextAttemptAt_idx" ON "payouts"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "payouts_beneficiaryUserId_idx" ON "payouts"("beneficiaryUserId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_account_changes" ADD CONSTRAINT "payout_account_changes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

