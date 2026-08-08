-- CreateEnum
CREATE TYPE "VoucherKind" AS ENUM ('GENERAL', 'RECEIPT', 'PAYMENT', 'INVOICE', 'REVERSAL');

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startJalali" TEXT NOT NULL,
    "endJalali" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN "kind" "VoucherKind" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "voucher_lines" ADD COLUMN "partyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_title_key" ON "fiscal_years"("title");

-- CreateIndex
CREATE INDEX "vouchers_kind_idx" ON "vouchers"("kind");

-- CreateIndex
CREATE INDEX "voucher_lines_partyId_idx" ON "voucher_lines"("partyId");

-- AddForeignKey
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
