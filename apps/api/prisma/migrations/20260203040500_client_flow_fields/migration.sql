-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "weightValue" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN "weightUnit" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "utensilsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "napkinsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "receiverPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN "changeForAmount" INTEGER;
ALTER TABLE "Order" ADD COLUMN "addressText" TEXT;
ALTER TABLE "Order" ADD COLUMN "addressStreet" TEXT;
ALTER TABLE "Order" ADD COLUMN "addressHouse" TEXT;
ALTER TABLE "Order" ADD COLUMN "addressEntrance" TEXT;
ALTER TABLE "Order" ADD COLUMN "addressApartment" TEXT;
