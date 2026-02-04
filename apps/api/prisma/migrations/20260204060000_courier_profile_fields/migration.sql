-- Courier profile fields + delivery method
CREATE TYPE "DeliveryMethod" AS ENUM ('WALK', 'BIKE', 'MOTO', 'CAR');

ALTER TABLE "Courier" ADD COLUMN "fullName" TEXT;
ALTER TABLE "Courier" ADD COLUMN "phone" TEXT;
ALTER TABLE "Courier" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "Courier" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Courier" ADD COLUMN "deliveryMethod" "DeliveryMethod";
ALTER TABLE "Courier" ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Courier" ADD COLUMN "maxActiveOrders" INTEGER NOT NULL DEFAULT 1;
