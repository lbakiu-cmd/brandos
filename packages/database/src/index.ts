import { PrismaClient } from "@prisma/client";

export { MembershipRole, Prisma, PrismaClient } from "@prisma/client";
export type {
  Business,
  Membership,
  Organization,
  Website,
} from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}
