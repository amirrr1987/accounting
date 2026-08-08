-- CreateEnum
CREATE TYPE "DisplayUnit" AS ENUM ('RIAL', 'TOMAN', 'THOUSAND_RIAL', 'THOUSAND_TOMAN');

-- AlterTable
ALTER TABLE "business_settings"
ADD COLUMN "displayUnit" "DisplayUnit" NOT NULL DEFAULT 'RIAL',
ADD COLUMN "inputUnit" "DisplayUnit" NOT NULL DEFAULT 'RIAL',
ADD COLUMN "moneyDisplayConfigured" BOOLEAN NOT NULL DEFAULT false;
