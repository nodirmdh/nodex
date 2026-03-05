-- Vendor profile fields
ALTER TABLE "Vendor" ADD COLUMN "ownerFullName" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "phone1" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "phone2" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "phone3" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "email" TEXT;

-- Promotion priority
ALTER TABLE "Promotion" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
