-- CreateEnum
CREATE TYPE "SocialProfilePlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'YOUTUBE', 'X', 'OTHER');

-- CreateEnum
CREATE TYPE "SocialProfileStatus" AS ENUM ('MANUAL_CONNECTED', 'VERIFIED', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "SocialProfile" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "platform" "SocialProfilePlatform" NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "status" "SocialProfileStatus" NOT NULL DEFAULT 'MANUAL_CONNECTED',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialProfile_businessId_platform_profileUrl_key" ON "SocialProfile"("businessId", "platform", "profileUrl");

-- CreateIndex
CREATE INDEX "SocialProfile_businessId_idx" ON "SocialProfile"("businessId");

-- CreateIndex
CREATE INDEX "SocialProfile_businessId_platform_idx" ON "SocialProfile"("businessId", "platform");

-- CreateIndex
CREATE INDEX "SocialProfile_businessId_isPrimary_idx" ON "SocialProfile"("businessId", "isPrimary");

-- CreateIndex
CREATE INDEX "SocialProfile_status_idx" ON "SocialProfile"("status");

-- AddForeignKey
ALTER TABLE "SocialProfile" ADD CONSTRAINT "SocialProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
