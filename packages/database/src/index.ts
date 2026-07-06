import { PrismaClient } from "@prisma/client";

export {
  MembershipRole,
  Prisma,
  PrismaClient,
  WebsiteCrawlStatus,
} from "@prisma/client";
export type {
  Business,
  Membership,
  Organization,
  Website,
  WebsiteCrawl,
} from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}
