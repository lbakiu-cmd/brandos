import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MembershipRole, Prisma } from "@brandos/database";
import type { Business, Membership, Organization } from "@brandos/database";
import { PrismaService } from "../database/prisma.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

const TEMPORARY_USER_ID = "temporary-local-user";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(
    input: CreateOrganizationDto,
  ): Promise<Organization & { memberships: Membership[] }> {
    const slug = await this.createUniqueOrganizationSlug(input.name);

    try {
      return await this.prisma.organization.create({
        data: {
          name: input.name.trim(),
          slug,
          memberships: {
            create: {
              userId: this.getTemporaryUserId(),
              role: MembershipRole.OWNER,
            },
          },
        },
        include: {
          memberships: true,
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Organization already exists.");
      throw error;
    }
  }

  async getOrganization(
    organizationId: string,
  ): Promise<Organization & { businesses: Business[] }> {
    await this.requireMembership(organizationId);

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        businesses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return organization;
  }

  async createBusiness(
    organizationId: string,
    input: CreateBusinessDto,
  ): Promise<Business> {
    await this.requireMembership(organizationId);

    const slug = await this.createUniqueBusinessSlug(
      organizationId,
      input.name,
    );

    try {
      return await this.prisma.business.create({
        data: {
          organizationId,
          name: input.name.trim(),
          slug,
          websiteUrl: input.websiteUrl,
          category: input.category?.trim(),
          country: input.country?.trim(),
          city: input.city?.trim(),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Business already exists.");
      throw error;
    }
  }

  async listBusinesses(organizationId: string): Promise<Business[]> {
    await this.requireMembership(organizationId);

    return this.prisma.business.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  private async requireMembership(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          organizationId,
          userId: this.getTemporaryUserId(),
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException("Organization access denied.");
    }

    return membership;
  }

  private getTemporaryUserId() {
    // Temporary until authentication lands. All Sprint 2A writes are scoped to
    // this local user id so tenant checks are still exercised by the API.
    return TEMPORARY_USER_ID;
  }

  private async createUniqueOrganizationSlug(name: string) {
    return this.createUniqueSlug(slugify(name), async (slug) => {
      const existing = await this.prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
      });
      return Boolean(existing);
    });
  }

  private async createUniqueBusinessSlug(organizationId: string, name: string) {
    return this.createUniqueSlug(slugify(name), async (slug) => {
      const existing = await this.prisma.business.findUnique({
        where: {
          organizationId_slug: {
            organizationId,
            slug,
          },
        },
        select: { id: true },
      });
      return Boolean(existing);
    });
  }

  private async createUniqueSlug(
    baseSlug: string,
    exists: (slug: string) => Promise<boolean>,
  ) {
    let slug = baseSlug;
    let suffix = 2;

    while (await exists(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private handleUniqueConstraint(error: unknown, message: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException(message);
    }
  }
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled";
}
