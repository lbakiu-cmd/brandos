-- CreateEnum
CREATE TYPE "GoogleBusinessProfileStatus" AS ENUM ('NOT_CONNECTED', 'MANUAL_CONNECTED', 'VERIFIED');

-- CreateTable
CREATE TABLE "GoogleBusinessProfile" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "placeId" TEXT,
    "businessName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "status" "GoogleBusinessProfileStatus" NOT NULL DEFAULT 'MANUAL_CONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleBusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleBusinessProfile_businessId_key" ON "GoogleBusinessProfile"("businessId");

-- CreateIndex
CREATE INDEX "GoogleBusinessProfile_status_idx" ON "GoogleBusinessProfile"("status");

-- AddForeignKey
ALTER TABLE "GoogleBusinessProfile" ADD CONSTRAINT "GoogleBusinessProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
