-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "mainImageUrl" TEXT,
ADD COLUMN     "galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
