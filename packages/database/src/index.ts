import { PrismaClient } from "@prisma/client";

export { MembershipRole, Prisma, PrismaClient } from "@prisma/client";
export type { Business, Membership, Organization } from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}
