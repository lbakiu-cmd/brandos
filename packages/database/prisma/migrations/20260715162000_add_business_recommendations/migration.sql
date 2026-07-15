-- CreateEnum
CREATE TYPE "BusinessRecommendationSourceType" AS ENUM ('WEBSITE', 'GOOGLE_BUSINESS', 'SOCIAL', 'AUDIT_FINDING', 'AI_VISIBILITY');

-- CreateEnum
CREATE TYPE "BusinessRecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BusinessRecommendationStatus" AS ENUM ('OPEN', 'DONE', 'IGNORED');

-- CreateTable
CREATE TABLE "BusinessRecommendation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceType" "BusinessRecommendationSourceType" NOT NULL,
    "priority" "BusinessRecommendationPriority" NOT NULL,
    "status" "BusinessRecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "actionLabel" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRecommendation_businessId_code_key" ON "BusinessRecommendation"("businessId", "code");

-- CreateIndex
CREATE INDEX "BusinessRecommendation_businessId_idx" ON "BusinessRecommendation"("businessId");

-- CreateIndex
CREATE INDEX "BusinessRecommendation_businessId_status_idx" ON "BusinessRecommendation"("businessId", "status");

-- CreateIndex
CREATE INDEX "BusinessRecommendation_priority_idx" ON "BusinessRecommendation"("priority");

-- CreateIndex
CREATE INDEX "BusinessRecommendation_sourceType_idx" ON "BusinessRecommendation"("sourceType");

-- AddForeignKey
ALTER TABLE "BusinessRecommendation" ADD CONSTRAINT "BusinessRecommendation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
