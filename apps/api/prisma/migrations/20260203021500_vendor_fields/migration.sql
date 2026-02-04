-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Vendor';
ALTER TABLE "Vendor" ADD COLUMN "phone" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "inn" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Vendor" ADD COLUMN "openingHours" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "payoutDetails" JSONB;

-- Remove placeholder default to enforce required name going forward
ALTER TABLE "Vendor" ALTER COLUMN "name" DROP DEFAULT;
