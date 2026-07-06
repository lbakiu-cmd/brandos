-- CreateEnum
CREATE TYPE "WebsiteCrawlStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "WebsiteCrawl" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "status" "WebsiteCrawlStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteCrawl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteCrawl_websiteId_idx" ON "WebsiteCrawl"("websiteId");
CREATE INDEX "WebsiteCrawl_status_idx" ON "WebsiteCrawl"("status");
CREATE INDEX "WebsiteCrawl_websiteId_status_idx" ON "WebsiteCrawl"("websiteId", "status");
CREATE INDEX "WebsiteCrawl_requestedAt_idx" ON "WebsiteCrawl"("requestedAt");

-- AddForeignKey
ALTER TABLE "WebsiteCrawl" ADD CONSTRAINT "WebsiteCrawl_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
