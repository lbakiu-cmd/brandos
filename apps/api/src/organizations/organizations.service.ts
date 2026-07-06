import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MembershipRole, Prisma } from "@brandos/database";
import { WebsiteCrawlStatus } from "@brandos/database";
import { PrismaService } from "../database/prisma.service";
import { CrawlQueueService } from "../queues/crawl-queue.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { CreateWebsiteDto } from "./dto/create-website.dto";
import { UpdateWebsiteDto } from "./dto/update-website.dto";

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

export type WebsiteSummary = {
  id: string;
  businessId: string;
  url: string;
  normalizedUrl: string;
  domain: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WebsiteCrawlSummary = {
  id: string;
  websiteId: string;
  status: WebsiteCrawlStatus;
  requestedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlQueue: CrawlQueueService,
  ) {}

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
    const normalizedWebsite =
      input.websiteUrl === undefined
        ? undefined
        : normalizeWebsiteUrl(input.websiteUrl);

    try {
      return await this.prisma.business.create({
        data: {
          organizationId,
          name: input.name.trim(),
          slug: input.slug,
          websiteUrl: input.websiteUrl,
          websites:
            normalizedWebsite === undefined
              ? undefined
              : {
                  create: {
                    ...normalizedWebsite,
                    isPrimary: true,
                  },
                },
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

  async createWebsite(
    organizationId: string,
    businessId: string,
    input: CreateWebsiteDto,
  ): Promise<WebsiteSummary> {
    await this.requireBusiness(organizationId, businessId);

    const normalizedWebsite = normalizeWebsiteUrl(input.url);
    const shouldBePrimary =
      input.isPrimary ?? (await this.countWebsites(businessId)) === 0;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (shouldBePrimary) {
          await tx.website.updateMany({
            where: { businessId },
            data: { isPrimary: false },
          });
        }

        return tx.website.create({
          data: {
            businessId,
            ...normalizedWebsite,
            isPrimary: shouldBePrimary,
          },
          select: websiteSummarySelect,
        });
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Website already exists.");
      throw error;
    }
  }

  async listWebsites(
    organizationId: string,
    businessId: string,
  ): Promise<WebsiteSummary[]> {
    await this.backfillBusinessWebsite(organizationId, businessId);

    return this.prisma.website.findMany({
      where: { businessId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: websiteSummarySelect,
    });
  }

  async updateWebsite(
    organizationId: string,
    businessId: string,
    websiteId: string,
    input: UpdateWebsiteDto,
  ): Promise<WebsiteSummary> {
    await this.requireWebsite(organizationId, businessId, websiteId);

    if (input.url === undefined && input.isPrimary === undefined) {
      throw new BadRequestException("At least one website field is required.");
    }

    const normalizedWebsite =
      input.url === undefined ? undefined : normalizeWebsiteUrl(input.url);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (input.isPrimary === true) {
          await tx.website.updateMany({
            where: { businessId },
            data: { isPrimary: false },
          });
        }

        return tx.website.update({
          where: { id: websiteId },
          data: {
            ...normalizedWebsite,
            ...(input.isPrimary === undefined
              ? {}
              : { isPrimary: input.isPrimary }),
          },
          select: websiteSummarySelect,
        });
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Website already exists.");
      throw error;
    }
  }

  async deleteWebsite(
    organizationId: string,
    businessId: string,
    websiteId: string,
  ): Promise<WebsiteSummary> {
    await this.requireWebsite(organizationId, businessId, websiteId);

    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { websiteUrl: true },
      });
      const deletedWebsite = await tx.website.delete({
        where: { id: websiteId },
        select: websiteSummarySelect,
      });

      if (
        business?.websiteUrl &&
        normalizeWebsiteUrl(business.websiteUrl).normalizedUrl ===
          deletedWebsite.normalizedUrl
      ) {
        await tx.business.update({
          where: { id: businessId },
          data: { websiteUrl: null },
        });
      }

      if (deletedWebsite.isPrimary) {
        const nextWebsite = await tx.website.findFirst({
          where: { businessId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        if (nextWebsite) {
          await tx.website.update({
            where: { id: nextWebsite.id },
            data: { isPrimary: true },
          });
        }
      }

      return deletedWebsite;
    });
  }

  async createWebsiteCrawl(
    organizationId: string,
    businessId: string,
    websiteId: string,
  ): Promise<WebsiteCrawlSummary> {
    await this.requireWebsite(organizationId, businessId, websiteId);

    const crawl = await this.prisma.websiteCrawl.create({
      data: {
        websiteId,
        status: WebsiteCrawlStatus.QUEUED,
        requestedAt: new Date(),
      },
      select: websiteCrawlSummarySelect,
    });

    await this.crawlQueue.enqueueWebsiteCrawl({
      crawlId: crawl.id,
      websiteId: crawl.websiteId,
    });

    return crawl;
  }

  async listWebsiteCrawls(
    organizationId: string,
    businessId: string,
    websiteId: string,
  ): Promise<WebsiteCrawlSummary[]> {
    await this.requireWebsite(organizationId, businessId, websiteId);

    return this.prisma.websiteCrawl.findMany({
      where: { websiteId },
      orderBy: { requestedAt: "desc" },
      select: websiteCrawlSummarySelect,
    });
  }

  async getWebsiteCrawl(
    organizationId: string,
    businessId: string,
    websiteId: string,
    crawlId: string,
  ): Promise<WebsiteCrawlSummary> {
    await this.requireWebsite(organizationId, businessId, websiteId);

    const crawl = await this.prisma.websiteCrawl.findFirst({
      where: {
        id: crawlId,
        websiteId,
      },
      select: websiteCrawlSummarySelect,
    });

    if (!crawl) {
      throw new NotFoundException("Website crawl not found.");
    }

    return crawl;
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

  private async requireBusiness(organizationId: string, businessId: string) {
    await this.requireMembership(organizationId);

    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        organizationId,
      },
      select: { id: true },
    });

    if (!business) {
      throw new NotFoundException("Business not found.");
    }

    return business;
  }

  private async requireWebsite(
    organizationId: string,
    businessId: string,
    websiteId: string,
  ) {
    await this.requireBusiness(organizationId, businessId);

    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        businessId,
      },
      select: { id: true },
    });

    if (!website) {
      throw new NotFoundException("Website not found.");
    }

    return website;
  }

  private countWebsites(businessId: string) {
    return this.prisma.website.count({
      where: { businessId },
    });
  }

  private async backfillBusinessWebsite(
    organizationId: string,
    businessId: string,
  ) {
    await this.requireBusiness(organizationId, businessId);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        websiteUrl: true,
        websites: {
          select: {
            id: true,
            normalizedUrl: true,
            isPrimary: true,
          },
        },
      },
    });

    if (!business?.websiteUrl || business.websites.length > 0) {
      return;
    }

    const normalizedWebsite = normalizeWebsiteUrl(business.websiteUrl);

    try {
      await this.prisma.website.create({
        data: {
          businessId,
          ...normalizedWebsite,
          isPrimary: true,
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Website already exists.");
      throw error;
    }
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

const websiteSummarySelect = {
  id: true,
  businessId: true,
  url: true,
  normalizedUrl: true,
  domain: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WebsiteSelect;

const websiteCrawlSummarySelect = {
  id: true,
  websiteId: true,
  status: true,
  requestedAt: true,
  startedAt: true,
  completedAt: true,
  errorMessage: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WebsiteCrawlSelect;

function normalizeWebsiteUrl(rawUrl: string) {
  const parsedUrl = new URL(rawUrl.trim());

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new BadRequestException("Website URL must use HTTP or HTTPS.");
  }

  parsedUrl.hash = "";
  parsedUrl.hostname = parsedUrl.hostname.toLowerCase();

  if (
    (parsedUrl.protocol === "https:" && parsedUrl.port === "443") ||
    (parsedUrl.protocol === "http:" && parsedUrl.port === "80")
  ) {
    parsedUrl.port = "";
  }

  if (parsedUrl.pathname !== "/") {
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");
  }

  const normalizedUrl = parsedUrl.toString();
  return {
    url: rawUrl.trim(),
    normalizedUrl,
    domain: parsedUrl.hostname.replace(/^www\./, ""),
  };
}
