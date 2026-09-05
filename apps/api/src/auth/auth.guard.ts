import "@fastify/cookie";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { prisma, Role } from "@brandos/database";
import { hashToken } from "./auth.service";

export const COOKIE_NAME = "brandos_session";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const token = (request as any).cookies?.[COOKIE_NAME];

    if (token) {
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashToken(token) },
        include: {
          user: { include: { memberships: { include: { business: true } } } },
        },
      });

      if (session && session.expiresAt.getTime() >= Date.now()) {
        const { passwordHash: _ignored, ...safeUser } = session.user;
        const requestedBizId =
          (request.headers["x-business-id"] as string) ||
          (request as any).cookies?.["brandos_active_business_id"] ||
          (safeUser as any).activeBusinessId;

        let activeBusinessId: string | undefined;
        if (
          requestedBizId &&
          (safeUser.isSuperAdmin ||
            safeUser.memberships?.some((m: any) => m.businessId === requestedBizId))
        ) {
          activeBusinessId = requestedBizId;
        } else if (safeUser.memberships && safeUser.memberships.length > 0) {
          activeBusinessId = safeUser.memberships[0].businessId;
        }

        (request as any).user = {
          ...safeUser,
          activeBusinessId,
        };
        (request as any).session = { id: session.id };
        return true;
      }
    }

    throw new UnauthorizedException("Session invalid or expired. Please sign in.");
  }
}