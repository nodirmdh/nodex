-- DropForeignKey
ALTER TABLE "DomainEvent" DROP CONSTRAINT "DomainEvent_orderId_fkey";

-- DropForeignKey
ALTER TABLE "MenuItem" DROP CONSTRAINT "MenuItem_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderTracking" DROP CONSTRAINT "OrderTracking_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionBuyXGetY" DROP CONSTRAINT "PromotionBuyXGetY_buyItemId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionBuyXGetY" DROP CONSTRAINT "PromotionBuyXGetY_getItemId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionBuyXGetY" DROP CONSTRAINT "PromotionBuyXGetY_promotionId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionComboItem" DROP CONSTRAINT "PromotionComboItem_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionComboItem" DROP CONSTRAINT "PromotionComboItem_promotionId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionGift" DROP CONSTRAINT "PromotionGift_giftItemId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionGift" DROP CONSTRAINT "PromotionGift_promotionId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionItem" DROP CONSTRAINT "PromotionItem_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionItem" DROP CONSTRAINT "PromotionItem_promotionId_fkey";

-- AlterTable
ALTER TABLE "MenuItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Promotion" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionItem" ADD CONSTRAINT "PromotionItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionItem" ADD CONSTRAINT "PromotionItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionComboItem" ADD CONSTRAINT "PromotionComboItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionComboItem" ADD CONSTRAINT "PromotionComboItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionBuyXGetY" ADD CONSTRAINT "PromotionBuyXGetY_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionBuyXGetY" ADD CONSTRAINT "PromotionBuyXGetY_buyItemId_fkey" FOREIGN KEY ("buyItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionBuyXGetY" ADD CONSTRAINT "PromotionBuyXGetY_getItemId_fkey" FOREIGN KEY ("getItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionGift" ADD CONSTRAINT "PromotionGift_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionGift" ADD CONSTRAINT "PromotionGift_giftItemId_fkey" FOREIGN KEY ("giftItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainEvent" ADD CONSTRAINT "DomainEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTracking" ADD CONSTRAINT "OrderTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
