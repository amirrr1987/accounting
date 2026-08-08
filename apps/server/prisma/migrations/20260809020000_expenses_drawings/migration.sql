-- CreateEnum
CREATE TYPE "ExpensePayFrom" AS ENUM ('CASH', 'BANK');

-- Expense categories (حقوق، کرایه، ...)
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "coaAccountCode" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_categories_code_key" ON "expense_categories"("code");

-- Expenses
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "payFrom" "ExpensePayFrom" NOT NULL DEFAULT 'CASH',
    "cashAccountId" TEXT,
    "bankAccountId" TEXT,
    "partyId" TEXT,
    "voucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expenses_voucherId_key" ON "expenses"("voucherId");
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Business owners (برای برداشت شخصی — پیش از فاز شراکت کامل)
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "nationalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- Owner drawings
CREATE TABLE "owner_drawings" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "payFrom" "ExpensePayFrom" NOT NULL DEFAULT 'CASH',
    "cashAccountId" TEXT,
    "bankAccountId" TEXT,
    "voucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_drawings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "owner_drawings_voucherId_key" ON "owner_drawings"("voucherId");
CREATE INDEX "owner_drawings_ownerId_idx" ON "owner_drawings"("ownerId");
CREATE INDEX "owner_drawings_date_idx" ON "owner_drawings"("date");

ALTER TABLE "owner_drawings" ADD CONSTRAINT "owner_drawings_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "owner_drawings" ADD CONSTRAINT "owner_drawings_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
