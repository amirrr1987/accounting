-- CreateEnum
CREATE TYPE "ProductPricingMode" AS ENUM ('FIXED', 'AT_INVOICE');
CREATE TYPE "WeightAdjustmentKind" AS ENUM ('SHORTAGE', 'SURPLUS');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK_PAYABLE', 'CHECK_RECEIVABLE');

-- Product pricing mode
ALTER TABLE "products" ADD COLUMN "pricingMode" "ProductPricingMode" NOT NULL DEFAULT 'AT_INVOICE';

-- Invoice line catalog price snapshot
ALTER TABLE "invoice_lines" ADD COLUMN "catalogUnitPrice" BIGINT;

-- Weight adjustments (کسر/اضافه بار)
CREATE TABLE "weight_adjustments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "WeightAdjustmentKind" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "costAmount" BIGINT NOT NULL,
    "sourceInvoiceId" TEXT,
    "voucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weight_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "weight_adjustments_voucherId_key" ON "weight_adjustments"("voucherId");
CREATE INDEX "weight_adjustments_productId_idx" ON "weight_adjustments"("productId");
CREATE INDEX "weight_adjustments_date_idx" ON "weight_adjustments"("date");

ALTER TABLE "weight_adjustments" ADD CONSTRAINT "weight_adjustments_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "weight_adjustments" ADD CONSTRAINT "weight_adjustments_sourceInvoiceId_fkey"
  FOREIGN KEY ("sourceInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "weight_adjustments" ADD CONSTRAINT "weight_adjustments_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bank accounts
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "sheba" TEXT,
    "coaAccountId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bank_accounts_coaAccountId_key" ON "bank_accounts"("coaAccountId");
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_coaAccountId_fkey"
  FOREIGN KEY ("coaAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Payment method on vouchers
ALTER TABLE "vouchers" ADD COLUMN "paymentMethod" "PaymentMethod";
ALTER TABLE "vouchers" ADD COLUMN "bankAccountId" TEXT;
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_bankAccountId_fkey"
  FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
