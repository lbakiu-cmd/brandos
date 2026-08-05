import { Injectable } from "@nestjs/common";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaService } from "../database/prisma.service";

const localDevelopmentSecret =
  "brandos-local-development-secret-change-before-production";

function createAuth(prisma: PrismaService) {
  const configuredSecret = process.env.BETTER_AUTH_SECRET;

  if (process.env.NODE_ENV === "production" && !configuredSecret) {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }

  return betterAuth({
    appName: "BrandOS",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
    basePath: "/auth",
    secret: configuredSecret ?? localDevelopmentSecret,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: true },
    trustedOrigins: [
      process.env.WEB_ORIGIN ?? "http://localhost:3000",
      "http://localhost:3000",
    ],
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
  });
}

@Injectable()
export class AuthService {
  readonly auth: ReturnType<typeof createAuth>;

  constructor(prisma: PrismaService) {
    this.auth = createAuth(prisma);
  }
}
