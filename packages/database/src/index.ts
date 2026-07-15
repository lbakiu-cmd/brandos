import { PrismaClient } from "@prisma/client";

export {
  GoogleBusinessProfileStatus,
  MembershipRole,
  Prisma,
  PrismaClient,
  WebsiteCrawlStatus,
} from "@prisma/client";
export type {
  Business,
  GoogleBusinessProfile,
  Membership,
  Organization,
  Website,
  WebsiteCrawl,
} from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}
