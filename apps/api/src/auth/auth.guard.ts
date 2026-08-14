import "@fastify/cookie";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { prisma } from "@brandos/database";
import { hashToken } from "./auth.service";

export const COOKIE_NAME = "brandos_session";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const token = (request as any).cookies?.[COOKIE_NAME];

    if (!token) throw new UnauthorizedException("Not authenticated.");

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: { include: { memberships: { include: { business: true } } } },
      },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Session expired.");
    }

    const { passwordHash: _ignored, ...safeUser } = session.user;
    (request as any).user = safeUser;
    (request as any).session = { id: session.id };
    return true;
  }
}