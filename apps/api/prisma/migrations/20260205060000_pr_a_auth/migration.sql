-- Vendor auth + block fields
ALTER TABLE "Vendor" ADD COLUMN "login" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN "blockedReason" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "blockedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Vendor_login_key" ON "Vendor"("login");

-- Client auth + avatar fields
ALTER TABLE "Client" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Client" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN "avatarFileId" TEXT;
ALTER TABLE "Client" ADD COLUMN "avatarUrl" TEXT;
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");

-- Courier auth + avatar + block fields
ALTER TABLE "Courier" ADD COLUMN "login" TEXT;
ALTER TABLE "Courier" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Courier" ADD COLUMN "avatarFileId" TEXT;
ALTER TABLE "Courier" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "Courier" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Courier" ADD COLUMN "blockedReason" TEXT;
ALTER TABLE "Courier" ADD COLUMN "blockedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Courier_login_key" ON "Courier"("login");
