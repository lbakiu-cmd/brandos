-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;

-- Backfill organization slugs for existing local data before enforcing NOT NULL.
UPDATE "Organization"
SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING("id", 1, 8)
WHERE "slug" IS NULL;

ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "category" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "slug" TEXT,
ALTER COLUMN "websiteUrl" DROP NOT NULL;

-- Backfill business slugs for existing local data before enforcing NOT NULL.
UPDATE "Business"
SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING("id", 1, 8)
WHERE "slug" IS NULL;

ALTER TABLE "Business" ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- Preserve existing placeholder memberships before replacing the old table.
INSERT INTO "Membership" ("id", "organizationId", "userId", "role", "createdAt")
SELECT
    "id",
    "organizationId",
    "userId",
    CASE UPPER("role")
        WHEN 'OWNER' THEN 'OWNER'::"MembershipRole"
        WHEN 'ADMIN' THEN 'ADMIN'::"MembershipRole"
        ELSE 'MEMBER'::"MembershipRole"
    END,
    "createdAt"
FROM "OrganizationMembership";

-- DropForeignKey
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_organizationId_fkey";
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_userId_fkey";

-- DropTable
DROP TABLE "OrganizationMembership";
DROP TABLE "User";

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");
CREATE UNIQUE INDEX "Business_organizationId_slug_key" ON "Business"("organizationId", "slug");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
