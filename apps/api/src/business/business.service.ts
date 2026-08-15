import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@brandos/database";

@Injectable()
export class BusinessService {
  async get(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");
    return membership.business;
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
    const membership = await prisma.membership.findFirst({ where: { userId } });
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