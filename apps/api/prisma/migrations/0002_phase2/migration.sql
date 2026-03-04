-- Create enums
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE "OrderStatus" AS ENUM (
  'NEW',
  'ACCEPTED',
  'COOKING',
  'READY',
  'READY_FOR_PICKUP',
  'PICKED_UP_BY_CUSTOMER',
  'COURIER_ACCEPTED',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
  'CANCELLED_BY_VENDOR'
);

-- Promotions extensions
CREATE TABLE "PromotionComboItem" (
  "id" TEXT PRIMARY KEY,
  "promotionId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "PromotionComboItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionComboItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PromotionComboItem_promotionId_menuItemId_key" ON "PromotionComboItem"("promotionId", "menuItemId");

CREATE TABLE "PromotionBuyXGetY" (
  "id" TEXT PRIMARY KEY,
  "promotionId" TEXT NOT NULL UNIQUE,
  "buyItemId" TEXT NOT NULL,
  "buyQuantity" INTEGER NOT NULL,
  "getItemId" TEXT NOT NULL,
  "getQuantity" INTEGER NOT NULL,
  "discountPercent" INTEGER NOT NULL,
  CONSTRAINT "PromotionBuyXGetY_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionBuyXGetY_buyItemId_fkey" FOREIGN KEY ("buyItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionBuyXGetY_getItemId_fkey" FOREIGN KEY ("getItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PromotionGift" (
  "id" TEXT PRIMARY KEY,
  "promotionId" TEXT NOT NULL UNIQUE,
  "giftItemId" TEXT NOT NULL,
  "giftQuantity" INTEGER NOT NULL,
  "minOrderAmount" INTEGER NOT NULL,
  CONSTRAINT "PromotionGift_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionGift_giftItemId_fkey" FOREIGN KEY ("giftItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Orders
CREATE TABLE "Order" (
  "id" TEXT PRIMARY KEY,
  "vendorId" TEXT NOT NULL,
  "clientId" TEXT,
  "courierId" TEXT,
  "fulfillmentType" "FulfillmentType" NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "deliveryLat" DOUBLE PRECISION,
  "deliveryLng" DOUBLE PRECISION,
  "deliveryComment" TEXT,
  "itemsSubtotal" INTEGER NOT NULL,
  "discountTotal" INTEGER NOT NULL,
  "serviceFee" INTEGER NOT NULL,
  "deliveryFee" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "promoItemsCount" INTEGER NOT NULL,
  "comboCount" INTEGER NOT NULL,
  "buyxgetyCount" INTEGER NOT NULL,
  "giftCount" INTEGER NOT NULL,
  "pickupCodeHash" TEXT NOT NULL,
  "pickupCodeSalt" TEXT NOT NULL,
  "deliveryCodeHash" TEXT NOT NULL,
  "deliveryCodeSalt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "OrderItem" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "isGift" BOOLEAN NOT NULL DEFAULT false,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DomainEvent" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DomainEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
