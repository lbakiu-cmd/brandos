import { PrismaClient } from "@prisma/client";

export {
  GoogleBusinessProfileStatus,
  MembershipRole,
  Prisma,
  PrismaClient,
  SocialProfilePlatform,
  SocialProfileStatus,
  WebsiteCrawlStatus,
} from "@prisma/client";
export type {
  Business,
  GoogleBusinessProfile,
  Membership,
  Organization,
  SocialProfile,
  Website,
  WebsiteCrawl,
} from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}
