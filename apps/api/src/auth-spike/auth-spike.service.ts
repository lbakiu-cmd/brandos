import { Injectable } from "@nestjs/common";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaService } from "../database/prisma.service";

const developmentSecret =
  "brandos-better-auth-spike-development-only-secret";

function createAuth(prisma: PrismaService) {
  const configuredSecret = process.env.BETTER_AUTH_SECRET;

  if (process.env.NODE_ENV === "production" && !configuredSecret) {
    throw new Error("BETTER_AUTH_SECRET is required in production.");
  }

  return betterAuth({
    appName: "BrandOS Auth Spike",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
    basePath: "/api/auth",
    secret: configuredSecret ?? developmentSecret,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: true },
    trustedOrigins: [
      process.env.WEB_ORIGIN ?? "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
  });
}

@Injectable()
export class AuthSpikeService {
  readonly auth: ReturnType<typeof createAuth>;

  constructor(prisma: PrismaService) {
    this.auth = createAuth(prisma);
  }
}
