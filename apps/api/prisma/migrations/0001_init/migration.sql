-- Create enums
CREATE TYPE "VendorCategory" AS ENUM ('RESTAURANTS', 'PRODUCTS', 'PHARMACY', 'MARKET');
CREATE TYPE "PromotionType" AS ENUM ('FIXED_PRICE', 'PERCENT', 'COMBO', 'BUY_X_GET_Y', 'GIFT');

-- Create tables
CREATE TABLE "Vendor" (
  "id" TEXT PRIMARY KEY,
  "category" "VendorCategory" NOT NULL,
  "supportsPickup" BOOLEAN NOT NULL DEFAULT false,
  "addressText" TEXT,
  "geoLat" DOUBLE PRECISION NOT NULL,
  "geoLng" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MenuItem" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MenuItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Promotion" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL,
  "promoType" "PromotionType" NOT NULL,
  "valueNumeric" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Promotion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PromotionItem" (
  "id" TEXT PRIMARY KEY,
  "promotionId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  CONSTRAINT "PromotionItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PromotionItem_promotionId_menuItemId_key" ON "PromotionItem"("promotionId", "menuItemId");
