import { Injectable, BadRequestException } from "@nestjs/common";
import { prisma, Role } from "@brandos/database";

@Injectable()
export class BusinessService {
  async get(userId: string) {
    let membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
      orderBy: { createdAt: "desc" },
    });

    if (!membership) {
      let business = await prisma.business.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (!business) {
        business = await prisma.business.create({
          data: {
            name: "Your Business",
            industry: "Dental & Healthcare",
            city: "Austin, TX",
            website: "https://yourbusiness.com",
            phone: "(512) 555-0199",
            email: "contact@yourbusiness.com",
          },
        });
      }

      await prisma.membership.create({
        data: {
          userId,
          businessId: business.id,
          role: Role.OWNER,
        },
      }).catch(() => {});

      return business;
    }

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

    if (memberships.length === 0) {
      const biz = await this.get(userId);
      return [
        {
          id: biz.id,
          name: biz.name,
          city: biz.city,
          industry: biz.industry,
          website: biz.website,
          phone: biz.phone,
          subscriptionTier: biz.subscriptionTier,
          role: Role.OWNER,
          latestScore: null,
          reviewsCount: 0,
          competitorsCount: 0,
          createdAt: biz.createdAt,
        },
      ];
    }

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
    let membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    let businessId: string;

    if (!membership) {
      let business = await prisma.business.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (!business) {
        business = await prisma.business.create({
          data: {
            name: data.name?.trim() || "Your Business",
            city: data.city?.trim() || null,
            industry: data.industry?.trim() || "Dental & Healthcare",
            website: data.website?.trim() || null,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
          },
        });
      }

      await prisma.membership.create({
        data: {
          userId,
          businessId: business.id,
          role: Role.OWNER,
        },
      }).catch(() => {});

      businessId = business.id;
    } else {
      businessId = membership.businessId;
    }

    const clean = (v?: string) =>
      v === undefined ? undefined : v.trim() === "" ? null : v.trim();

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        name: clean(data.name) ?? undefined,
        city: clean(data.city),
        industry: clean(data.industry),
        website: clean(data.website),
        phone: clean(data.phone),
        email: clean(data.email),
      },
      include: { integrations: true },
    });

    // Invalidate cached metrics so fresh data is computed for new business name/industry/city
    if (updated.integrations && updated.integrations.length > 0) {
      for (const integration of updated.integrations) {
        await prisma.integrationAccount.update({
          where: { id: integration.id },
          data: {
            accountName: `${updated.name} (${integration.provider})`,
            metricsCache: null,
            lastSyncedAt: new Date(),
          },
        });
      }
    }

    return updated;
  }
}