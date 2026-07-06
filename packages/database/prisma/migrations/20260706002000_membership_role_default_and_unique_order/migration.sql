-- Align Membership with the Sprint 2A domain contract.
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'OWNER';

DROP INDEX "Membership_organizationId_userId_key";
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
