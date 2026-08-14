import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs"; // Fixed CJS import
import { prisma, Role } from "@brandos/database";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  async register(input: {
    email: string;
    password: string;
    name?: string;
    businessName?: string;
  }) {
    const email = input.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const businessName = input.businessName ?? email.split("@")[0] + " Business";

    const user = await prisma.user.create({
      data: {
        email,
        name: input.name ?? null,
        passwordHash,
        memberships: {
          create: {
            role: Role.OWNER,
            business: { create: { name: businessName } },
          },
        },
      },
    });

    return this.issueSession(user.id);
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) throw new UnauthorizedException("Invalid email or password.");

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return this.issueSession(user.id);
  }

  async logout(sessionId: string) {
    await prisma.session.delete({ where: { id: sessionId } });
  }

  private async issueSession(userId: string) {
    const token = randomBytes(32).toString("hex");

    await prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return { token, user: await this.getSafeUser(userId) };
  }

  private async getSafeUser(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { memberships: { include: { business: true } } },
    });

    const { passwordHash: _ignored, ...safeUser } = user;
    return safeUser;
  }
}