DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Address') THEN
    ALTER TABLE "Address" DROP CONSTRAINT IF EXISTS "Address_clientId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeRedemption') THEN
    ALTER TABLE "PromoCodeRedemption" DROP CONSTRAINT IF EXISTS "PromoCodeRedemption_clientId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Rating') THEN
    ALTER TABLE "Rating" DROP CONSTRAINT IF EXISTS "Rating_orderId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeRedemption') THEN
    ALTER TABLE "PromoCodeRedemption"
      ADD CONSTRAINT "PromoCodeRedemption_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Address') THEN
    ALTER TABLE "Address"
      ADD CONSTRAINT "Address_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Rating') THEN
    ALTER TABLE "Rating"
      ADD CONSTRAINT "Rating_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
