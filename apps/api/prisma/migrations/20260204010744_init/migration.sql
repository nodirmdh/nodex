DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'PromoCodeRedemption'
  ) THEN
    EXECUTE 'ALTER TABLE "PromoCodeRedemption" DROP CONSTRAINT IF EXISTS "PromoCodeRedemption_clientId_fkey"';
    EXECUTE 'ALTER TABLE "PromoCodeRedemption" ADD CONSTRAINT "PromoCodeRedemption_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
  END IF;
END $$;
