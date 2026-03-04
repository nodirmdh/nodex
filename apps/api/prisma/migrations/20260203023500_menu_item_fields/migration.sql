-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Item';
ALTER TABLE "MenuItem" ADD COLUMN "description" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN "category" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN "imageUrl" TEXT;

-- Remove placeholder default to enforce required title going forward
ALTER TABLE "MenuItem" ALTER COLUMN "title" DROP DEFAULT;
