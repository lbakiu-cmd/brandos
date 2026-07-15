-- CreateEnum
CREATE TYPE "WebsiteAuditFindingCategory" AS ENUM ('TECHNICAL', 'CONTENT', 'SCHEMA', 'LOCAL_SEO', 'AI_VISIBILITY');

-- CreateEnum
CREATE TYPE "WebsiteAuditFindingSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "WebsiteAuditFindingStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "WebsiteAuditFinding" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "crawlId" TEXT,
    "category" "WebsiteAuditFindingCategory" NOT NULL,
    "severity" "WebsiteAuditFindingSeverity" NOT NULL,
    "status" "WebsiteAuditFindingStatus" NOT NULL DEFAULT 'OPEN',
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAuditFinding_websiteId_code_key" ON "WebsiteAuditFinding"("websiteId", "code");

-- CreateIndex
CREATE INDEX "WebsiteAuditFinding_websiteId_idx" ON "WebsiteAuditFinding"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteAuditFinding_crawlId_idx" ON "WebsiteAuditFinding"("crawlId");

-- CreateIndex
CREATE INDEX "WebsiteAuditFinding_status_idx" ON "WebsiteAuditFinding"("status");

-- CreateIndex
CREATE INDEX "WebsiteAuditFinding_severity_idx" ON "WebsiteAuditFinding"("severity");

-- CreateIndex
CREATE INDEX "WebsiteAuditFinding_category_idx" ON "WebsiteAuditFinding"("category");

-- CreateIndex
CREATE INDEX "WebsiteAuditFinding_websiteId_status_idx" ON "WebsiteAuditFinding"("websiteId", "status");

-- AddForeignKey
ALTER TABLE "WebsiteAuditFinding" ADD CONSTRAINT "WebsiteAuditFinding_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteAuditFinding" ADD CONSTRAINT "WebsiteAuditFinding_crawlId_fkey" FOREIGN KEY ("crawlId") REFERENCES "WebsiteCrawl"("id") ON DELETE SET NULL ON UPDATE CASCADE;
