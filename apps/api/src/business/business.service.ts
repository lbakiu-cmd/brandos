import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { prisma, Role } from "@brandos/database";

@Injectable()
export class BusinessService {
  async get(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: "desc" },
    });
    if (!membership) throw new NotFoundException("No business found.");
    return membership.business;
  }

  async list(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        business: {
          include: {
            websiteAudits: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: { select: { reviews: true, competitors: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m: any) => ({
      id: m.business.id,
      name: m.business.name,
      city: m.business.city,
      industry: m.business.industry,
      website: m.business.website,
      phone: m.business.phone,
      subscriptionTier: m.business.subscriptionTier,
      role: m.role,
      latestScore: m.business.websiteAudits[0]?.score ?? null,
      reviewsCount: m.business._count.reviews,
      competitorsCount: m.business._count.competitors,
      createdAt: m.business.createdAt,
    }));
  }

  async create(
    userId: string,
    data: {
      name: string;
      city?: string;
      industry?: string;
      website?: string;
      phone?: string;
      email?: string;
    },
  ) {
    if (!data.name || data.name.trim() === "") {
      throw new BadRequestException("Client business name is required.");
    }

    const clean = (v?: string) =>
      v === undefined ? undefined : v.trim() === "" ? null : v.trim();

    const business = await prisma.business.create({
      data: {
        name: data.name.trim(),
        city: clean(data.city),
        industry: clean(data.industry) || "Local Business",
        website: clean(data.website),
        phone: clean(data.phone),
        email: clean(data.email),
        memberships: {
          create: {
            userId,
            role: Role.OWNER,
          },
        },
      },
    });

    return business;
  }

  async update(
    userId: string,
    data: {
      name?: string;
      city?: string;
      industry?: string;
      website?: string;
      phone?: string;
      email?: string;
    },
  ) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (!membership) throw new NotFoundException("No business found.");

    const clean = (v?: string) =>
      v === undefined ? undefined : v.trim() === "" ? null : v.trim();

    return prisma.business.update({
      where: { id: membership.businessId },
      data: {
        name: clean(data.name) ?? undefined,
        city: clean(data.city),
        industry: clean(data.industry),
        website: clean(data.website),
        phone: clean(data.phone),
        email: clean(data.email),
      },
    });
  }
}