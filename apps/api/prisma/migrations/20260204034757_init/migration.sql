-- DropForeignKey
ALTER TABLE IF EXISTS "Address" DROP CONSTRAINT IF EXISTS "Address_clientId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "PromoCodeRedemption" DROP CONSTRAINT IF EXISTS "PromoCodeRedemption_clientId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Rating" DROP CONSTRAINT IF EXISTS "Rating_orderId_fkey";

-- AddForeignKey
ALTER TABLE IF EXISTS "PromoCodeRedemption" ADD CONSTRAINT "PromoCodeRedemption_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Address" ADD CONSTRAINT "Address_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "Rating" ADD CONSTRAINT "Rating_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
