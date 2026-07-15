import { PrismaClient } from "@prisma/client";

export {
  BusinessRecommendationPriority,
  BusinessRecommendationSourceType,
  BusinessRecommendationStatus,
  GoogleBusinessProfileStatus,
  MembershipRole,
  Prisma,
  PrismaClient,
  SocialProfilePlatform,
  SocialProfileStatus,
  WebsiteAuditFindingCategory,
  WebsiteAuditFindingSeverity,
  WebsiteAuditFindingStatus,
  WebsiteCrawlStatus,
} from "@prisma/client";
export type {
  Business,
  BusinessRecommendation,
  BusinessVisibilityScore,
  GoogleBusinessProfile,
  Membership,
  Organization,
  SocialProfile,
  WebsiteAuditFinding,
  Website,
  WebsiteCrawl,
} from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}
