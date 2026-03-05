-- Allow pickup code hash/salt to be generated later (on READY)
ALTER TABLE "Order" ALTER COLUMN "pickupCodeHash" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "pickupCodeSalt" DROP NOT NULL;
