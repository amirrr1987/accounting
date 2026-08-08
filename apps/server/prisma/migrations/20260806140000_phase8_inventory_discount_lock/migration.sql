-- AlterTable products
ALTER TABLE "products" ADD COLUMN "stockQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "costPrice" BIGINT NOT NULL DEFAULT 0;

-- AlterTable invoices
ALTER TABLE "invoices" ADD COLUMN "headerDiscount" BIGINT NOT NULL DEFAULT 0;

-- AlterTable invoice_lines
ALTER TABLE "invoice_lines" ADD COLUMN "discountAmount" BIGINT NOT NULL DEFAULT 0;

-- AlterTable fiscal_years
ALTER TABLE "fiscal_years" ADD COLUMN "closedThroughJalali" TEXT;
