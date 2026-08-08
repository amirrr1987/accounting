-- Business partners (شرکا)
CREATE TABLE "business_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "nationalId" TEXT,
    "sharePercent" DOUBLE PRECISION NOT NULL,
    "coaCapitalAccountId" TEXT NOT NULL,
    "coaDrawingAccountId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_partners_coaCapitalAccountId_key" ON "business_partners"("coaCapitalAccountId");
CREATE UNIQUE INDEX "business_partners_coaDrawingAccountId_key" ON "business_partners"("coaDrawingAccountId");

ALTER TABLE "business_partners" ADD CONSTRAINT "business_partners_coaCapitalAccountId_fkey"
  FOREIGN KEY ("coaCapitalAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_partners" ADD CONSTRAINT "business_partners_coaDrawingAccountId_fkey"
  FOREIGN KEY ("coaDrawingAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partner drawings
CREATE TABLE "partner_drawings" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "payFrom" "ExpensePayFrom" NOT NULL DEFAULT 'CASH',
    "cashAccountId" TEXT,
    "bankAccountId" TEXT,
    "voucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_drawings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_drawings_voucherId_key" ON "partner_drawings"("voucherId");
CREATE INDEX "partner_drawings_partnerId_idx" ON "partner_drawings"("partnerId");
CREATE INDEX "partner_drawings_date_idx" ON "partner_drawings"("date");

ALTER TABLE "partner_drawings" ADD CONSTRAINT "partner_drawings_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "business_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_drawings" ADD CONSTRAINT "partner_drawings_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
