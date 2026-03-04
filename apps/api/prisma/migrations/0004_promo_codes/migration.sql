CREATE TYPE "PromoCodeType" AS ENUM ('PERCENT', 'FIXED');

ALTER TABLE "Order"
  ADD COLUMN "promoCodeId" TEXT,
  ADD COLUMN "promoCodeType" "PromoCodeType",
  ADD COLUMN "promoCodeValue" INTEGER,
  ADD COLUMN "promoCodeDiscount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PromoCode" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL,
  "type" "PromoCodeType" NOT NULL,
  "value" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "minOrderSum" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

CREATE TABLE "ClientPromoCode" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "promoCodeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientPromoCode_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ClientPromoCode_clientId_promoCodeId_key" ON "ClientPromoCode"("clientId", "promoCodeId");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
