import { PrismaClient } from "@prisma/client";

// Re-export everything from Prisma Client (all enums, types, and namespaces)
export * from "@prisma/client";

export function createPrismaClient() {
  return new PrismaClient();
}