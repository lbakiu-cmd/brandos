import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { PrismaService } from "../database/prisma.service";
import { AuthSessionService } from "./auth-session.service";
import { AuthenticatedRequest } from "./current-user.decorator";

type OrganizationRouteParams = {
  organizationId?: string;
};

@Injectable()
export class AuthSessionGuard implements CanActivate {
  constructor(
    private readonly sessions: AuthSessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = await this.sessions.requireUser(request.headers);
    (request as AuthenticatedRequest).authenticatedUser = user;

    const { organizationId } = request.params as OrganizationRouteParams;
    if (!organizationId) return true;

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException("Organization access denied.");
    }

    return true;
  }
}
