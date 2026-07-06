import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MembershipRole, Prisma } from "@brandos/database";
import { PrismaService } from "../database/prisma.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

const TEMPORARY_USER_ID = "temporary-local-user";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
};

export type OrganizationDetail = OrganizationSummary;

export type BusinessSummary = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  category: string | null;
  country: string | null;
  city: string | null;
};

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(
    input: CreateOrganizationDto,
  ): Promise<OrganizationSummary> {
    try {
      return await this.prisma.organization.create({
        data: {
          name: input.name.trim(),
          slug: input.slug,
          memberships: {
            create: {
              userId: this.getTemporaryUserId(),
              role: MembershipRole.OWNER,
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Organization already exists.");
      throw error;
    }
  }

  async listOrganizations(): Promise<OrganizationSummary[]> {
    return this.prisma.organization.findMany({
      where: {
        memberships: {
          some: {
            userId: this.getTemporaryUserId(),
          },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async getOrganization(organizationId: string): Promise<OrganizationDetail> {
    await this.requireMembership(organizationId);

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
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
  ): Promise<BusinessSummary> {
    await this.requireMembership(organizationId);

    try {
      return await this.prisma.business.create({
        data: {
          organizationId,
          name: input.name.trim(),
          slug: input.slug,
          websiteUrl: input.websiteUrl,
          category: input.category?.trim(),
          country: input.country?.trim(),
          city: input.city?.trim(),
        },
        select: businessSummarySelect,
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Business already exists.");
      throw error;
    }
  }

  async listBusinesses(organizationId: string): Promise<BusinessSummary[]> {
    await this.requireMembership(organizationId);

    return this.prisma.business.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: businessSummarySelect,
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

  private handleUniqueConstraint(error: unknown, message: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException(message);
    }
  }
}

const businessSummarySelect = {
  id: true,
  organizationId: true,
  name: true,
  slug: true,
  websiteUrl: true,
  category: true,
  country: true,
  city: true,
} satisfies Prisma.BusinessSelect;
