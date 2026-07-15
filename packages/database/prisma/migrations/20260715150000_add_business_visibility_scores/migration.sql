-- CreateTable
CREATE TABLE "BusinessVisibilityScore" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "grade" TEXT,
    "summary" TEXT,
    "inputs" JSONB NOT NULL,
    "breakdown" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessVisibilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessVisibilityScore_businessId_key" ON "BusinessVisibilityScore"("businessId");

-- CreateIndex
CREATE INDEX "BusinessVisibilityScore_businessId_idx" ON "BusinessVisibilityScore"("businessId");

-- CreateIndex
CREATE INDEX "BusinessVisibilityScore_score_idx" ON "BusinessVisibilityScore"("score");

-- CreateIndex
CREATE INDEX "BusinessVisibilityScore_calculatedAt_idx" ON "BusinessVisibilityScore"("calculatedAt");

-- AddForeignKey
ALTER TABLE "BusinessVisibilityScore" ADD CONSTRAINT "BusinessVisibilityScore_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
