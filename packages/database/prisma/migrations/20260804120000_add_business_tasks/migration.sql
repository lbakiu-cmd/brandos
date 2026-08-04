-- CreateEnum
CREATE TYPE "BusinessTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'IGNORED');

-- CreateEnum
CREATE TYPE "BusinessTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BusinessTaskSourceType" AS ENUM ('WEBSITE', 'GOOGLE_BUSINESS', 'SOCIAL', 'AUDIT_FINDING', 'AI_VISIBILITY', 'MANUAL');

-- CreateTable
CREATE TABLE "BusinessTask" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "BusinessTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "BusinessTaskPriority" NOT NULL,
    "sourceType" "BusinessTaskSourceType" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTask_pkey" PRIMARY KEY ("id")
);

-- Prevent duplicate actionable tasks while preserving completed/ignored history.
CREATE UNIQUE INDEX "BusinessTask_open_recommendationId_key"
ON "BusinessTask"("recommendationId")
WHERE "recommendationId" IS NOT NULL AND "status" IN ('TODO', 'IN_PROGRESS');

-- CreateIndex
CREATE INDEX "BusinessTask_businessId_idx" ON "BusinessTask"("businessId");

-- CreateIndex
CREATE INDEX "BusinessTask_businessId_status_idx" ON "BusinessTask"("businessId", "status");

-- CreateIndex
CREATE INDEX "BusinessTask_businessId_priority_idx" ON "BusinessTask"("businessId", "priority");

-- CreateIndex
CREATE INDEX "BusinessTask_recommendationId_idx" ON "BusinessTask"("recommendationId");

-- CreateIndex
CREATE INDEX "BusinessTask_sourceType_idx" ON "BusinessTask"("sourceType");

-- CreateIndex
CREATE INDEX "BusinessTask_dueDate_idx" ON "BusinessTask"("dueDate");

-- AddForeignKey
ALTER TABLE "BusinessTask" ADD CONSTRAINT "BusinessTask_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTask" ADD CONSTRAINT "BusinessTask_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "BusinessRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
