-- DropForeignKey
ALTER TABLE "ClientPromoCode" DROP CONSTRAINT "ClientPromoCode_promoCodeId_fkey";

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PromoCode" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "ClientPromoCode" ADD CONSTRAINT "ClientPromoCode_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
