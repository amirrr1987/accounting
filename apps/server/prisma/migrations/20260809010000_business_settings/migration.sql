-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SHOP', 'WORKSHOP', 'WAREHOUSE', 'FACTORY', 'COMPANY', 'OTHER');

CREATE TABLE "business_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL DEFAULT 'کسب‌وکار من',
    "businessType" "BusinessType" NOT NULL DEFAULT 'SHOP',
    "businessTypeCustom" TEXT,
    "legalName" TEXT,
    "nationalId" TEXT,
    "economicCode" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "business_settings" ("id", "businessName", "businessType", "updatedAt")
VALUES ('default', 'کسب‌وکار من', 'SHOP', CURRENT_TIMESTAMP);
