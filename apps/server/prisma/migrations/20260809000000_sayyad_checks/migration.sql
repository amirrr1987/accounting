-- CreateEnum
CREATE TYPE "CheckKind" AS ENUM ('RECEIVABLE', 'PAYABLE');
CREATE TYPE "CheckStatus" AS ENUM ('IN_PORTFOLIO', 'DEPOSITED', 'CLEARED', 'RETURNED', 'ENDORSED', 'PAID');

-- Checks (صیادی)
CREATE TABLE "checks" (
    "id" TEXT NOT NULL,
    "kind" "CheckKind" NOT NULL,
    "sayyadNumber" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "partyId" TEXT NOT NULL,
    "drawerNationalId" TEXT NOT NULL,
    "drawerMobile" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchCode" TEXT,
    "accountNumber" TEXT,
    "status" "CheckStatus" NOT NULL DEFAULT 'IN_PORTFOLIO',
    "receiptVoucherId" TEXT,
    "bankAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checks_sayyadNumber_key" ON "checks"("sayyadNumber");
CREATE UNIQUE INDEX "checks_receiptVoucherId_key" ON "checks"("receiptVoucherId");
CREATE INDEX "checks_partyId_idx" ON "checks"("partyId");
CREATE INDEX "checks_status_idx" ON "checks"("status");
CREATE INDEX "checks_dueDate_idx" ON "checks"("dueDate");

ALTER TABLE "checks" ADD CONSTRAINT "checks_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checks" ADD CONSTRAINT "checks_receiptVoucherId_fkey"
  FOREIGN KEY ("receiptVoucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "checks" ADD CONSTRAINT "checks_bankAccountId_fkey"
  FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Check lifecycle events
CREATE TABLE "check_events" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "voucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "check_events_voucherId_key" ON "check_events"("voucherId");
CREATE INDEX "check_events_checkId_idx" ON "check_events"("checkId");

ALTER TABLE "check_events" ADD CONSTRAINT "check_events_checkId_fkey"
  FOREIGN KEY ("checkId") REFERENCES "checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "check_events" ADD CONSTRAINT "check_events_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
