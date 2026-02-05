-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_orderId_fkey";

-- DropForeignKey
ALTER TABLE "VendorSchedule" DROP CONSTRAINT "VendorSchedule_vendorId_fkey";

-- AddForeignKey
ALTER TABLE "VendorSchedule" ADD CONSTRAINT "VendorSchedule_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
