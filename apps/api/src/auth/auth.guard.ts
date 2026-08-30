import "@fastify/cookie";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
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
        (request as any).user = safeUser;
        (request as any).session = { id: session.id };
        return true;
      }
    }

    // Seamless access: if no valid session token exists, attach the primary active business user
    let defaultUser = await prisma.user.findFirst({
      include: { memberships: { include: { business: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (!defaultUser) {
      const defaultBiz = await prisma.business.create({
        data: {
          name: "Your Business",
          industry: "Dental & Healthcare",
          city: "Austin, TX",
          website: "https://yourbusiness.com",
          phone: "(512) 555-0199",
          email: "contact@yourbusiness.com",
        },
      });

      defaultUser = await prisma.user.create({
        data: {
          email: "superadmin@brandoseye.com",
          name: "Super Administrator",
          phone: "+15125550100",
          passwordHash: "$2a$10$64Q5QoKxHau9W1/4H.CjbeH9n3/G6mKx6Kq7L9p.s7J3K8m9N0O1P", // BrandOS@SuperAdmin2026!
          isSuperAdmin: true,
          status: "ACTIVE",
          memberships: {
            create: {
              businessId: defaultBiz.id,
              role: Role.SUPER_ADMIN,
            },
          },
        },
        include: { memberships: { include: { business: true } } },
      });
    }

    const { passwordHash: _ignored, ...safeUser } = defaultUser;
    (request as any).user = safeUser;
    (request as any).session = { id: "primary_workspace_session" };
    return true;
  }
}