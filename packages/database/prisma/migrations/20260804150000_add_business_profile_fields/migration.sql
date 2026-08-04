-- AlterTable
ALTER TABLE "Business"
ADD COLUMN "description" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "openingHours" JSONB,
ADD COLUMN "services" JSONB;
