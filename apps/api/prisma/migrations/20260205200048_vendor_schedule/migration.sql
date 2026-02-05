-- Add vendor schedule and timezone
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Weekday') THEN
    CREATE TYPE "Weekday" AS ENUM ('MON','TUE','WED','THU','FRI','SAT','SUN');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "VendorSchedule" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "weekday" "Weekday" NOT NULL,
  "openTime" TEXT,
  "closeTime" TEXT,
  "closed" BOOLEAN NOT NULL DEFAULT false,
  "is24h" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorSchedule_vendorId_weekday_key" ON "VendorSchedule"("vendorId", "weekday");

ALTER TABLE "VendorSchedule"
  ADD CONSTRAINT "VendorSchedule_vendorId_fkey"
  FOREIGN KEY ("vendorId")
  REFERENCES "Vendor"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;