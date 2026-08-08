-- AlterEnum
ALTER TYPE "InvoiceKind" ADD VALUE 'SALE_RETURN';
ALTER TYPE "InvoiceKind" ADD VALUE 'PURCHASE_RETURN';

-- Party commission default
ALTER TABLE "parties" ADD COLUMN "commissionRate" DOUBLE PRECISION;

-- Invoice returns + commission
ALTER TABLE "invoices" ADD COLUMN "returnedOfId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "returnReason" TEXT;
ALTER TABLE "invoices" ADD COLUMN "commissionAmount" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN "commissionRate" DOUBLE PRECISION;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_returnedOfId_fkey"
  FOREIGN KEY ("returnedOfId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "invoices_returnedOfId_idx" ON "invoices"("returnedOfId");

-- Return line link to original
ALTER TABLE "invoice_lines" ADD COLUMN "sourceLineId" TEXT;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_sourceLineId_fkey"
  FOREIGN KEY ("sourceLineId") REFERENCES "invoice_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Units of measure
CREATE TABLE "units_of_measure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "baseUnitId" TEXT,
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "units_of_measure_code_key" ON "units_of_measure"("code");

ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_baseUnitId_fkey"
  FOREIGN KEY ("baseUnitId") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "products" ADD COLUMN "defaultUnitId" TEXT;
ALTER TABLE "products" ADD CONSTRAINT "products_defaultUnitId_fkey"
  FOREIGN KEY ("defaultUnitId") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_lines" ADD COLUMN "unitId" TEXT;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
