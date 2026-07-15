import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BusinessRecommendationPriority,
  BusinessRecommendationSourceType,
  BusinessRecommendationStatus,
  GoogleBusinessProfileStatus,
  MembershipRole,
  Prisma,
  SocialProfilePlatform,
  SocialProfileStatus,
  WebsiteAuditFindingCategory,
  WebsiteAuditFindingSeverity,
  WebsiteAuditFindingStatus,
} from "@brandos/database";
import { WebsiteCrawlStatus } from "@brandos/database";
import { PrismaService } from "../database/prisma.service";
import { CrawlQueueService } from "../queues/crawl-queue.service";
import { isIP } from "node:net";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { CreateGoogleBusinessProfileDto } from "./dto/create-google-business-profile.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { CreateSocialProfileDto } from "./dto/create-social-profile.dto";
import { CreateWebsiteDto } from "./dto/create-website.dto";
import { UpdateBusinessRecommendationDto } from "./dto/update-business-recommendation.dto";
import { UpdateGoogleBusinessProfileDto } from "./dto/update-google-business-profile.dto";
import { UpdateSocialProfileDto } from "./dto/update-social-profile.dto";
import { UpdateWebsiteAuditFindingDto } from "./dto/update-website-audit-finding.dto";
import { UpdateWebsiteDto } from "./dto/update-website.dto";

const TEMPORARY_USER_ID = "temporary-local-user";
const MVP_VISIBILITY_SCORE_CAP = 89;
const ADVANCED_VISIBILITY_CHECKS_AVAILABLE = false;
const MVP_SCORE_CAP_MESSAGE =
  "Advanced visibility checks are not available yet, so this MVP score is capped.";

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

export type GoogleBusinessProfileSummary = {
  id: string;
  businessId: string;
  profileUrl: string;
  placeId: string | null;
  businessName: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  websiteUrl: string | null;
  status: GoogleBusinessProfileStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type SocialProfileSummary = {
  id: string;
  businessId: string;
  platform: SocialProfilePlatform;
  profileUrl: string;
  handle: string | null;
  displayName: string | null;
  status: SocialProfileStatus;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WebsiteAuditFindingSummary = {
  id: string;
  websiteId: string;
  crawlId: string | null;
  category: WebsiteAuditFindingCategory;
  severity: WebsiteAuditFindingSeverity;
  status: WebsiteAuditFindingStatus;
  code: string;
  title: string;
  description: string;
  recommendation: string | null;
  evidence: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessVisibilityScoreSummary = {
  id: string;
  businessId: string;
  score: number;
  grade: string | null;
  summary: string | null;
  inputs: Prisma.JsonValue;
  breakdown: Prisma.JsonValue;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type BusinessRecommendationSummary = {
  id: string;
  businessId: string;
  sourceType: BusinessRecommendationSourceType;
  priority: BusinessRecommendationPriority;
  status: BusinessRecommendationStatus;
  code: string;
  title: string;
  description: string;
  impact: string | null;
  actionLabel: string | null;
  evidence: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

type RecommendationCandidate = {
  sourceType: BusinessRecommendationSourceType;
  priority: BusinessRecommendationPriority;
  code: string;
  title: string;
  description: string;
  impact?: string;
  actionLabel?: string;
  evidence?: Prisma.InputJsonObject;
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

  async getBusinessVisibilityScore(
    organizationId: string,
    businessId: string,
  ): Promise<BusinessVisibilityScoreSummary | null> {
    await this.requireBusiness(organizationId, businessId);

    return this.prisma.businessVisibilityScore.findUnique({
      where: { businessId },
      select: businessVisibilityScoreSummarySelect,
    });
  }

  async calculateBusinessVisibilityScore(
    organizationId: string,
    businessId: string,
  ): Promise<BusinessVisibilityScoreSummary> {
    await this.requireBusiness(organizationId, businessId);

    const calculation = await this.buildVisibilityScoreCalculation(businessId);
    const calculatedAt = new Date();

    return this.prisma.businessVisibilityScore.upsert({
      where: { businessId },
      create: {
        businessId,
        score: calculation.score,
        grade: calculation.grade,
        summary: calculation.summary,
        inputs: calculation.inputs,
        breakdown: calculation.breakdown,
        calculatedAt,
      },
      update: {
        score: calculation.score,
        grade: calculation.grade,
        summary: calculation.summary,
        inputs: calculation.inputs,
        breakdown: calculation.breakdown,
        calculatedAt,
      },
      select: businessVisibilityScoreSummarySelect,
    });
  }

  async listBusinessRecommendations(
    organizationId: string,
    businessId: string,
  ): Promise<BusinessRecommendationSummary[]> {
    await this.requireBusiness(organizationId, businessId);

    const recommendations = await this.prisma.businessRecommendation.findMany({
      where: { businessId },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: businessRecommendationSummarySelect,
    });

    return sortBusinessRecommendations(recommendations);
  }

  async generateBusinessRecommendations(
    organizationId: string,
    businessId: string,
  ): Promise<BusinessRecommendationSummary[]> {
    await this.requireBusiness(organizationId, businessId);

    const candidates = await this.buildRecommendationCandidates(businessId);
    const activeCodes = candidates.map((candidate) => candidate.code);

    await this.prisma.$transaction(async (tx) => {
      if (activeCodes.length > 0) {
        await tx.businessRecommendation.updateMany({
          where: {
            businessId,
            status: BusinessRecommendationStatus.OPEN,
            code: { notIn: activeCodes },
          },
          data: { status: BusinessRecommendationStatus.DONE },
        });
      }

      for (const candidate of candidates) {
        await tx.businessRecommendation.upsert({
          where: {
            businessId_code: {
              businessId,
              code: candidate.code,
            },
          },
          create: {
            businessId,
            sourceType: candidate.sourceType,
            priority: candidate.priority,
            code: candidate.code,
            title: candidate.title,
            description: candidate.description,
            impact: candidate.impact,
            actionLabel: candidate.actionLabel,
            evidence: candidate.evidence,
          },
          update: {
            sourceType: candidate.sourceType,
            priority: candidate.priority,
            title: candidate.title,
            description: candidate.description,
            impact: candidate.impact,
            actionLabel: candidate.actionLabel,
            evidence: candidate.evidence,
          },
        });
      }
    });

    return this.listBusinessRecommendations(organizationId, businessId);
  }

  async updateBusinessRecommendation(
    organizationId: string,
    businessId: string,
    recommendationId: string,
    input: UpdateBusinessRecommendationDto,
  ): Promise<BusinessRecommendationSummary> {
    await this.requireBusiness(organizationId, businessId);

    const recommendation = await this.prisma.businessRecommendation.findFirst({
      where: {
        id: recommendationId,
        businessId,
      },
      select: { id: true },
    });

    if (!recommendation) {
      throw new NotFoundException("Business recommendation not found.");
    }

    return this.prisma.businessRecommendation.update({
      where: { id: recommendationId },
      data: { status: input.status },
      select: businessRecommendationSummarySelect,
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

  async getGoogleBusinessProfile(
    organizationId: string,
    businessId: string,
  ): Promise<GoogleBusinessProfileSummary | null> {
    await this.requireBusiness(organizationId, businessId);

    return this.prisma.googleBusinessProfile.findUnique({
      where: { businessId },
      select: googleBusinessProfileSummarySelect,
    });
  }

  async createGoogleBusinessProfile(
    organizationId: string,
    businessId: string,
    input: CreateGoogleBusinessProfileDto,
  ): Promise<GoogleBusinessProfileSummary> {
    await this.requireBusiness(organizationId, businessId);
    assertGoogleBusinessProfileUrl(input.profileUrl);

    try {
      return await this.prisma.googleBusinessProfile.create({
        data: {
          businessId,
          profileUrl: input.profileUrl.trim(),
          placeId: optionalTrim(input.placeId),
          businessName: optionalTrim(input.businessName),
          address: optionalTrim(input.address),
          city: optionalTrim(input.city),
          country: optionalTrim(input.country),
          phone: optionalTrim(input.phone),
          websiteUrl: optionalTrim(input.websiteUrl),
          status: GoogleBusinessProfileStatus.MANUAL_CONNECTED,
        },
        select: googleBusinessProfileSummarySelect,
      });
    } catch (error) {
      this.handleUniqueConstraint(
        error,
        "Google Business Profile already exists.",
      );
      throw error;
    }
  }

  async updateGoogleBusinessProfile(
    organizationId: string,
    businessId: string,
    input: UpdateGoogleBusinessProfileDto,
  ): Promise<GoogleBusinessProfileSummary> {
    await this.requireBusiness(organizationId, businessId);

    const existingProfile = await this.prisma.googleBusinessProfile.findUnique({
      where: { businessId },
      select: { id: true },
    });

    if (!existingProfile) {
      throw new NotFoundException("Google Business Profile not found.");
    }

    if (input.profileUrl !== undefined) {
      assertGoogleBusinessProfileUrl(input.profileUrl);
    }

    return this.prisma.googleBusinessProfile.update({
      where: { businessId },
      data: {
        ...(input.profileUrl === undefined
          ? {}
          : { profileUrl: input.profileUrl.trim() }),
        ...(input.placeId === undefined
          ? {}
          : { placeId: optionalTrim(input.placeId) }),
        ...(input.businessName === undefined
          ? {}
          : { businessName: optionalTrim(input.businessName) }),
        ...(input.address === undefined
          ? {}
          : { address: optionalTrim(input.address) }),
        ...(input.city === undefined ? {} : { city: optionalTrim(input.city) }),
        ...(input.country === undefined
          ? {}
          : { country: optionalTrim(input.country) }),
        ...(input.phone === undefined
          ? {}
          : { phone: optionalTrim(input.phone) }),
        ...(input.websiteUrl === undefined
          ? {}
          : { websiteUrl: optionalTrim(input.websiteUrl) }),
        status: GoogleBusinessProfileStatus.MANUAL_CONNECTED,
      },
      select: googleBusinessProfileSummarySelect,
    });
  }

  async deleteGoogleBusinessProfile(
    organizationId: string,
    businessId: string,
  ): Promise<GoogleBusinessProfileSummary> {
    await this.requireBusiness(organizationId, businessId);

    try {
      return await this.prisma.googleBusinessProfile.delete({
        where: { businessId },
        select: googleBusinessProfileSummarySelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException("Google Business Profile not found.");
      }

      throw error;
    }
  }

  async listSocialProfiles(
    organizationId: string,
    businessId: string,
  ): Promise<SocialProfileSummary[]> {
    await this.requireBusiness(organizationId, businessId);

    return this.prisma.socialProfile.findMany({
      where: { businessId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: socialProfileSummarySelect,
    });
  }

  async createSocialProfile(
    organizationId: string,
    businessId: string,
    input: CreateSocialProfileDto,
  ): Promise<SocialProfileSummary> {
    await this.requireBusiness(organizationId, businessId);
    assertSocialProfileUrl(input.platform, input.profileUrl);

    const shouldBePrimary =
      input.isPrimary ??
      (await this.prisma.socialProfile.count({ where: { businessId } })) === 0;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (shouldBePrimary) {
          await tx.socialProfile.updateMany({
            where: { businessId },
            data: { isPrimary: false },
          });
        }

        return tx.socialProfile.create({
          data: {
            businessId,
            platform: input.platform,
            profileUrl: input.profileUrl.trim(),
            handle: optionalTrim(input.handle),
            displayName: optionalTrim(input.displayName),
            status: SocialProfileStatus.MANUAL_CONNECTED,
            isPrimary: shouldBePrimary,
          },
          select: socialProfileSummarySelect,
        });
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Social profile already exists.");
      throw error;
    }
  }

  async updateSocialProfile(
    organizationId: string,
    businessId: string,
    socialProfileId: string,
    input: UpdateSocialProfileDto,
  ): Promise<SocialProfileSummary> {
    const existingProfile = await this.requireSocialProfile(
      organizationId,
      businessId,
      socialProfileId,
    );

    const nextPlatform = input.platform ?? existingProfile.platform;
    const nextProfileUrl = input.profileUrl ?? existingProfile.profileUrl;
    assertSocialProfileUrl(nextPlatform, nextProfileUrl);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (input.isPrimary === true) {
          await tx.socialProfile.updateMany({
            where: { businessId },
            data: { isPrimary: false },
          });
        }

        return tx.socialProfile.update({
          where: { id: socialProfileId },
          data: {
            ...(input.platform === undefined
              ? {}
              : { platform: input.platform }),
            ...(input.profileUrl === undefined
              ? {}
              : { profileUrl: input.profileUrl.trim() }),
            ...(input.handle === undefined
              ? {}
              : { handle: optionalTrim(input.handle) }),
            ...(input.displayName === undefined
              ? {}
              : { displayName: optionalTrim(input.displayName) }),
            ...(input.isPrimary === undefined
              ? {}
              : { isPrimary: input.isPrimary }),
            status: SocialProfileStatus.MANUAL_CONNECTED,
          },
          select: socialProfileSummarySelect,
        });
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Social profile already exists.");
      throw error;
    }
  }

  async deleteSocialProfile(
    organizationId: string,
    businessId: string,
    socialProfileId: string,
  ): Promise<SocialProfileSummary> {
    await this.requireSocialProfile(
      organizationId,
      businessId,
      socialProfileId,
    );

    return this.prisma.$transaction(async (tx) => {
      const deletedProfile = await tx.socialProfile.delete({
        where: { id: socialProfileId },
        select: socialProfileSummarySelect,
      });

      if (deletedProfile.isPrimary) {
        const nextProfile = await tx.socialProfile.findFirst({
          where: { businessId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        if (nextProfile) {
          await tx.socialProfile.update({
            where: { id: nextProfile.id },
            data: { isPrimary: true },
          });
        }
      }

      return deletedProfile;
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

  async listWebsiteAuditFindings(
    organizationId: string,
    businessId: string,
    websiteId: string,
  ): Promise<WebsiteAuditFindingSummary[]> {
    await this.requireWebsite(organizationId, businessId, websiteId);

    return this.prisma.websiteAuditFinding.findMany({
      where: { websiteId },
      orderBy: [{ severity: "desc" }, { status: "asc" }, { createdAt: "desc" }],
      select: websiteAuditFindingSummarySelect,
    });
  }

  async updateWebsiteAuditFinding(
    organizationId: string,
    businessId: string,
    websiteId: string,
    findingId: string,
    input: UpdateWebsiteAuditFindingDto,
  ): Promise<WebsiteAuditFindingSummary> {
    await this.requireWebsite(organizationId, businessId, websiteId);

    const finding = await this.prisma.websiteAuditFinding.findFirst({
      where: {
        id: findingId,
        websiteId,
      },
      select: { id: true },
    });

    if (!finding) {
      throw new NotFoundException("Website audit finding not found.");
    }

    return this.prisma.websiteAuditFinding.update({
      where: { id: findingId },
      data: { status: input.status },
      select: websiteAuditFindingSummarySelect,
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

  private async requireSocialProfile(
    organizationId: string,
    businessId: string,
    socialProfileId: string,
  ) {
    await this.requireBusiness(organizationId, businessId);

    const socialProfile = await this.prisma.socialProfile.findFirst({
      where: {
        id: socialProfileId,
        businessId,
      },
      select: {
        id: true,
        platform: true,
        profileUrl: true,
      },
    });

    if (!socialProfile) {
      throw new NotFoundException("Social profile not found.");
    }

    return socialProfile;
  }

  private async buildRecommendationCandidates(
    businessId: string,
  ): Promise<RecommendationCandidate[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        websites: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            domain: true,
            isPrimary: true,
            crawls: {
              where: { status: WebsiteCrawlStatus.COMPLETED },
              orderBy: { completedAt: "desc" },
              take: 1,
              select: {
                id: true,
                completedAt: true,
                metadata: true,
              },
            },
            auditFindings: {
              where: { status: WebsiteAuditFindingStatus.OPEN },
              select: {
                id: true,
                code: true,
                title: true,
                severity: true,
                category: true,
              },
            },
          },
        },
        googleBusinessProfile: {
          select: {
            id: true,
            status: true,
            businessName: true,
            address: true,
            city: true,
            country: true,
            phone: true,
          },
        },
        socialProfiles: {
          where: { status: SocialProfileStatus.MANUAL_CONNECTED },
          select: {
            id: true,
            platform: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException("Business not found.");
    }

    const primaryWebsite =
      business.websites.find((website) => website.isPrimary) ??
      business.websites[0] ??
      null;
    const latestCrawl = primaryWebsite?.crawls[0] ?? null;
    const metadata = parseHomepageMetadata(latestCrawl?.metadata);
    const schemaTypes = metadata.schemaTypes.map((schemaType) =>
      schemaType.toLowerCase(),
    );
    const openAuditFindings = business.websites.flatMap((website) =>
      website.auditFindings.map((finding) => ({
        ...finding,
        websiteId: website.id,
      })),
    );

    const recommendations: RecommendationCandidate[] = [];

    if (!latestCrawl) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.WEBSITE,
        priority: BusinessRecommendationPriority.HIGH,
        code: "website.scan_homepage",
        title: "Scan the primary website homepage",
        description:
          "Run a website scan so BrandOS can inspect homepage metadata, headings, schema, and crawl health signals.",
        impact:
          "Website scan data unlocks stronger visibility scoring and better recommendations.",
        actionLabel: "Scan website",
        evidence: {
          primaryWebsiteId: primaryWebsite?.id ?? null,
          domain: primaryWebsite?.domain ?? null,
          latestCompletedCrawlId: null,
        },
      });
    }

    if (latestCrawl && metadata.schemaTypes.length === 0) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.WEBSITE,
        priority: BusinessRecommendationPriority.HIGH,
        code: "website.add_schema",
        title: "Add structured data schema to the homepage",
        description:
          "The latest homepage scan did not detect JSON-LD schema. Add relevant schema so search and answer engines can understand the business entity.",
        impact:
          "Structured data improves machine-readable context for AI and search systems.",
        actionLabel: "Add schema",
        evidence: {
          websiteId: primaryWebsite?.id ?? null,
          crawlId: latestCrawl.id,
          schemaTypes: metadata.schemaTypes,
        },
      });
    }

    if (latestCrawl && !schemaTypes.includes("localbusiness")) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.WEBSITE,
        priority: BusinessRecommendationPriority.HIGH,
        code: "website.add_localbusiness_schema",
        title: "Add LocalBusiness schema",
        description:
          "Add LocalBusiness schema with the business name, address, phone, website, and service area to strengthen local entity clarity.",
        impact:
          "LocalBusiness schema helps AI systems connect the website to the real-world local business.",
        actionLabel: "Add LocalBusiness schema",
        evidence: {
          websiteId: primaryWebsite?.id ?? null,
          crawlId: latestCrawl.id,
          schemaTypes: metadata.schemaTypes,
        },
      });
    }

    if (latestCrawl && !schemaTypes.includes("faqpage")) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.WEBSITE,
        priority: BusinessRecommendationPriority.MEDIUM,
        code: "website.add_faq_schema",
        title: "Add service FAQ content",
        description:
          "Create helpful FAQ sections for common customer questions and mark them up with FAQPage schema where appropriate.",
        impact:
          "Clear FAQs give AI answer engines quotable, structured answers about services, pricing, process, and local availability.",
        actionLabel: "Plan FAQ content",
        evidence: {
          websiteId: primaryWebsite?.id ?? null,
          crawlId: latestCrawl.id,
          schemaTypes: metadata.schemaTypes,
        },
      });
    }

    if (
      latestCrawl &&
      openAuditFindings.length === 0 &&
      metadata.pageTitle &&
      metadata.metaDescription &&
      metadata.h1Count === 1 &&
      metadata.schemaTypes.length > 0
    ) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.AI_VISIBILITY,
        priority: BusinessRecommendationPriority.LOW,
        code: "website.expand_service_pages",
        title: "Expand service pages for AI answer visibility",
        description:
          "The homepage foundation looks healthy. Next, create detailed service pages that answer specific customer questions in your local market.",
        impact:
          "Service-specific pages increase the chances that AI systems can cite the business for precise local queries.",
        actionLabel: "Plan service pages",
        evidence: {
          websiteId: primaryWebsite?.id ?? null,
          crawlId: latestCrawl.id,
          openAuditFindingCount: openAuditFindings.length,
        },
      });
    }

    const googleProfile = business.googleBusinessProfile;
    if (!googleProfile) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.GOOGLE_BUSINESS,
        priority: BusinessRecommendationPriority.HIGH,
        code: "google_business.connect_profile",
        title: "Connect Google Business Profile details",
        description:
          "Add the business Google Maps or Google Business Profile URL and basic profile details so BrandOS can track local visibility readiness.",
        impact:
          "Google Business Profile is a core local visibility source for both search and AI-assisted local discovery.",
        actionLabel: "Connect profile",
        evidence: {
          connected: false,
        },
      });
    } else {
      const missingFields = [
        ["businessName", googleProfile.businessName],
        ["address", googleProfile.address],
        ["city", googleProfile.city],
        ["country", googleProfile.country],
        ["phone", googleProfile.phone],
      ]
        .filter(([, value]) => !value)
        .map(([field]) => field);

      if (missingFields.length > 0) {
        recommendations.push({
          sourceType: BusinessRecommendationSourceType.GOOGLE_BUSINESS,
          priority: BusinessRecommendationPriority.MEDIUM,
          code: "google_business.complete_profile",
          title: "Complete local profile details",
          description:
            "Add the missing Google Business Profile fields so the business name, address, phone, city, and country are consistent across channels.",
          impact:
            "Complete local profile details improve entity confidence and local relevance signals.",
          actionLabel: "Complete profile",
          evidence: {
            googleBusinessProfileId: googleProfile.id,
            missingFields,
          },
        });
      }

      if (googleProfile.status === GoogleBusinessProfileStatus.MANUAL_CONNECTED) {
        recommendations.push({
          sourceType: BusinessRecommendationSourceType.GOOGLE_BUSINESS,
          priority: BusinessRecommendationPriority.LOW,
          code: "google_business.prepare_verification",
          title: "Prepare for Google profile verification and live sync",
          description:
            "The profile is manually connected. Later, BrandOS can support verification and live sync when Google integration is added.",
          impact:
            "Verified live data will make future visibility intelligence more reliable.",
          actionLabel: "Coming later",
          evidence: {
            googleBusinessProfileId: googleProfile.id,
            status: googleProfile.status,
          },
        });
      }
    }

    if (business.socialProfiles.length === 0) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.SOCIAL,
        priority: BusinessRecommendationPriority.MEDIUM,
        code: "social.add_instagram_facebook",
        title: "Add Instagram or Facebook profiles",
        description:
          "Add the business Instagram and Facebook profile URLs so BrandOS can include social presence in visibility readiness.",
        impact:
          "Social profiles reinforce brand consistency and give customers more trusted discovery paths.",
        actionLabel: "Add social profile",
        evidence: {
          connectedProfileCount: 0,
        },
      });
    } else if (business.socialProfiles.length === 1) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.SOCIAL,
        priority: BusinessRecommendationPriority.LOW,
        code: "social.add_second_profile",
        title: "Add one more social profile",
        description:
          "Connect one additional active social profile to strengthen cross-channel brand consistency.",
        impact:
          "Multiple consistent profiles make the business easier to recognize across discovery surfaces.",
        actionLabel: "Add another profile",
        evidence: {
          connectedProfileCount: business.socialProfiles.length,
          platforms: business.socialProfiles.map((profile) => profile.platform),
        },
      });
    } else {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.SOCIAL,
        priority: BusinessRecommendationPriority.LOW,
        code: "social.presence_healthy",
        title: "Social presence foundation is healthy",
        description:
          "At least two social profiles are connected. Keep profile names, website links, and contact details consistent.",
        impact:
          "Consistent social profiles support brand recognition and customer trust.",
        actionLabel: "Maintain profiles",
        evidence: {
          connectedProfileCount: business.socialProfiles.length,
          platforms: business.socialProfiles.map((profile) => profile.platform),
        },
      });
    }

    recommendations.push(
      {
        sourceType: BusinessRecommendationSourceType.AI_VISIBILITY,
        priority: BusinessRecommendationPriority.MEDIUM,
        code: "ai_visibility.about_entity_description",
        title: "Add a clear About page entity description",
        description:
          "Write a concise About page that explains who the business serves, where it operates, what it offers, and why customers choose it.",
        impact:
          "A clear entity description helps AI systems summarize the business accurately.",
        actionLabel: "Improve About page",
        evidence: { businessName: business.name },
      },
      {
        sourceType: BusinessRecommendationSourceType.AI_VISIBILITY,
        priority: BusinessRecommendationPriority.MEDIUM,
        code: "ai_visibility.service_faq_pages",
        title: "Create service-specific FAQ pages",
        description:
          "Publish FAQ pages for important services with direct, customer-friendly answers to common local questions.",
        impact:
          "Question-led pages make the business more eligible for AI answer-style discovery.",
        actionLabel: "Plan FAQ pages",
        evidence: { businessName: business.name },
      },
      {
        sourceType: BusinessRecommendationSourceType.AI_VISIBILITY,
        priority: BusinessRecommendationPriority.MEDIUM,
        code: "ai_visibility.local_service_content",
        title: "Publish citation-worthy local service content",
        description:
          "Create practical local content that explains services, neighborhoods served, credentials, process, and customer decision factors.",
        impact:
          "Helpful, specific content gives AI systems better evidence to cite or summarize.",
        actionLabel: "Plan content",
        evidence: { businessName: business.name },
      },
      {
        sourceType: BusinessRecommendationSourceType.AI_VISIBILITY,
        priority: BusinessRecommendationPriority.HIGH,
        code: "ai_visibility.nap_consistency",
        title: "Keep business name, address, phone, and website consistent",
        description:
          "Review the website, Google Business Profile, social profiles, and other listings so name, address, phone, and website are consistent.",
        impact:
          "Consistent business facts improve entity confidence across search, maps, social, and AI answer systems.",
        actionLabel: "Check consistency",
        evidence: {
          googleBusinessProfileConnected: Boolean(googleProfile),
          socialProfileCount: business.socialProfiles.length,
        },
      },
    );

    for (const finding of openAuditFindings) {
      recommendations.push({
        sourceType: BusinessRecommendationSourceType.AUDIT_FINDING,
        priority: recommendationPriorityFromSeverity(finding.severity),
        code: `audit_finding.${finding.code}`,
        title: finding.title,
        description:
          "Resolve this open website audit finding to improve the deterministic visibility foundation.",
        impact:
          "Fixing audit findings improves the website health portion of the AI Visibility Score.",
        actionLabel: "Review finding",
        evidence: {
          findingId: finding.id,
          websiteId: finding.websiteId,
          findingCode: finding.code,
          severity: finding.severity,
          category: finding.category,
        },
      });
    }

    return recommendations;
  }

  private async buildVisibilityScoreCalculation(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        websites: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            isPrimary: true,
            crawls: {
              where: { status: WebsiteCrawlStatus.COMPLETED },
              orderBy: { completedAt: "desc" },
              take: 1,
              select: {
                id: true,
                status: true,
                completedAt: true,
                metadata: true,
              },
            },
          },
        },
        googleBusinessProfile: {
          select: {
            id: true,
            status: true,
            businessName: true,
            address: true,
            city: true,
            country: true,
          },
        },
        socialProfiles: {
          where: {
            status: SocialProfileStatus.MANUAL_CONNECTED,
          },
          select: {
            id: true,
            platform: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException("Business not found.");
    }

    const websiteIds = business.websites.map((website) => website.id);
    const openFindings =
      websiteIds.length === 0
        ? []
        : await this.prisma.websiteAuditFinding.findMany({
            where: {
              websiteId: { in: websiteIds },
              status: WebsiteAuditFindingStatus.OPEN,
            },
            select: {
              severity: true,
              code: true,
            },
          });

    const primaryWebsite =
      business.websites.find((website) => website.isPrimary) ??
      business.websites[0] ??
      null;
    const latestCrawl = primaryWebsite?.crawls[0] ?? null;
    const metadata = parseHomepageMetadata(latestCrawl?.metadata);
    const schemaTypes = metadata.schemaTypes.map((schemaType) =>
      schemaType.toLowerCase(),
    );
    const googleProfile = business.googleBusinessProfile;
    const googleConnected =
      googleProfile?.status === GoogleBusinessProfileStatus.MANUAL_CONNECTED ||
      googleProfile?.status === GoogleBusinessProfileStatus.VERIFIED;
    const googleComplete = Boolean(
      googleProfile?.businessName &&
        googleProfile.address &&
        googleProfile.city &&
        googleProfile.country,
    );
    const socialProfileCount = business.socialProfiles.length;
    const auditPenalty = openFindings.reduce(
      (total, finding) => total + auditPenaltyBySeverity(finding.severity),
      0,
    );

    const websiteFoundation = {
      key: "websiteFoundation",
      label: "Website foundation",
      earned:
        (primaryWebsite ? 10 : 0) +
        (latestCrawl ? 10 : 0) +
        (metadata.pageTitle ? 4 : 0) +
        (metadata.metaDescription ? 4 : 0) +
        (metadata.h1Count === 1 ? 4 : 0) +
        (metadata.schemaTypes.length > 0 ? 4 : 0) +
        (schemaTypes.includes("localbusiness") ? 4 : 0),
      possible: 40,
      details: {
        primaryWebsiteExists: Boolean(primaryWebsite),
        latestCrawlCompleted: Boolean(latestCrawl),
        titlePresent: Boolean(metadata.pageTitle),
        metaDescriptionPresent: Boolean(metadata.metaDescription),
        exactlyOneH1: metadata.h1Count === 1,
        schemaPresent: metadata.schemaTypes.length > 0,
        localBusinessSchemaPresent: schemaTypes.includes("localbusiness"),
      },
    };
    const localPresence = {
      key: "localPresence",
      label: "Local presence",
      earned: (googleConnected ? 20 : 0) + (googleComplete ? 5 : 0),
      possible: 25,
      details: {
        googleBusinessProfileConnected: googleConnected,
        googleBusinessProfileComplete: googleComplete,
      },
    };
    const socialPresence = {
      key: "socialPresence",
      label: "Social presence",
      earned: (socialProfileCount >= 1 ? 10 : 0) + (socialProfileCount >= 2 ? 5 : 0),
      possible: 15,
      details: {
        connectedProfileCount: socialProfileCount,
        hasOneSocialProfile: socialProfileCount >= 1,
        hasTwoOrMoreSocialProfiles: socialProfileCount >= 2,
      },
    };
    const auditHealth = {
      key: "auditHealth",
      label: "Audit health",
      earned: Math.max(0, 20 - auditPenalty),
      possible: 20,
      details: {
        openFindingCount: openFindings.length,
        penalty: auditPenalty,
        findingsBySeverity: countFindingsBySeverity(openFindings),
      },
    };
    const rawScore = clampScore(
      websiteFoundation.earned +
        localPresence.earned +
        socialPresence.earned +
        auditHealth.earned,
    );
    const isMvpCapped =
      !ADVANCED_VISIBILITY_CHECKS_AVAILABLE &&
      rawScore > MVP_VISIBILITY_SCORE_CAP;
    const score = isMvpCapped ? MVP_VISIBILITY_SCORE_CAP : rawScore;
    const grade = gradeVisibilityScore(score);
    const capAdjustment = score - rawScore;
    const scoreCalibration = {
      key: "scoreCalibration",
      label: "MVP confidence cap",
      earned: capAdjustment,
      possible: 0,
      details: {
        rawScore,
        cappedScore: score,
        capAdjustment,
        isMvpCapped,
        mvpScoreCap: MVP_VISIBILITY_SCORE_CAP,
        advancedVisibilityChecksAvailable: ADVANCED_VISIBILITY_CHECKS_AVAILABLE,
        note: isMvpCapped ? MVP_SCORE_CAP_MESSAGE : null,
      },
    };

    return {
      score,
      grade,
      summary: visibilityScoreSummary(rawScore, score, grade, isMvpCapped),
      inputs: {
        businessId,
        primaryWebsiteId: primaryWebsite?.id ?? null,
        latestCompletedCrawlId: latestCrawl?.id ?? null,
        googleBusinessProfileId: googleProfile?.id ?? null,
        socialProfileCount,
        openFindingCount: openFindings.length,
        rawScore,
        cappedScore: score,
        capAdjustment,
        isMvpCapped,
        mvpScoreCap: MVP_VISIBILITY_SCORE_CAP,
        advancedVisibilityChecksAvailable: ADVANCED_VISIBILITY_CHECKS_AVAILABLE,
      } satisfies Prisma.InputJsonObject,
      breakdown: {
        websiteFoundation,
        localPresence,
        socialPresence,
        auditHealth,
        scoreCalibration,
      } satisfies Prisma.InputJsonObject,
    };
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

const googleBusinessProfileSummarySelect = {
  id: true,
  businessId: true,
  profileUrl: true,
  placeId: true,
  businessName: true,
  address: true,
  city: true,
  country: true,
  phone: true,
  websiteUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GoogleBusinessProfileSelect;

const socialProfileSummarySelect = {
  id: true,
  businessId: true,
  platform: true,
  profileUrl: true,
  handle: true,
  displayName: true,
  status: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SocialProfileSelect;

const websiteAuditFindingSummarySelect = {
  id: true,
  websiteId: true,
  crawlId: true,
  category: true,
  severity: true,
  status: true,
  code: true,
  title: true,
  description: true,
  recommendation: true,
  evidence: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WebsiteAuditFindingSelect;

const businessVisibilityScoreSummarySelect = {
  id: true,
  businessId: true,
  score: true,
  grade: true,
  summary: true,
  inputs: true,
  breakdown: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BusinessVisibilityScoreSelect;

const businessRecommendationSummarySelect = {
  id: true,
  businessId: true,
  sourceType: true,
  priority: true,
  status: true,
  code: true,
  title: true,
  description: true,
  impact: true,
  actionLabel: true,
  evidence: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BusinessRecommendationSelect;

function assertGoogleBusinessProfileUrl(rawUrl: string) {
  if (!isValidGoogleBusinessProfileUrl(rawUrl)) {
    throw new BadRequestException(
      "Enter a Google Maps or Google Business Profile URL.",
    );
  }
}

function isValidGoogleBusinessProfileUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = url.pathname.toLowerCase();

  if (hostname === "maps.app.goo.gl") {
    return pathname.length > 1;
  }

  if (hostname === "goo.gl") {
    return pathname.startsWith("/maps/");
  }

  if (hostname === "maps.google.com") {
    return true;
  }

  if (hostname === "business.google.com") {
    return true;
  }

  if (hostname === "google.com") {
    return (
      pathname === "/maps" ||
      pathname.startsWith("/maps/") ||
      (pathname === "/search" && url.searchParams.has("q"))
    );
  }

  return false;
}

function optionalTrim(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function assertSocialProfileUrl(
  platform: SocialProfilePlatform,
  rawUrl: string,
) {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new BadRequestException("Social profile URL is invalid.");
  }

  if (!isSafePublicHttpUrl(url)) {
    throw new BadRequestException(
      "Social profile URL must be a safe public HTTP or HTTPS URL.",
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  const isValidForPlatform =
    platform === SocialProfilePlatform.OTHER ||
    (platform === SocialProfilePlatform.INSTAGRAM &&
      hostname === "instagram.com") ||
    (platform === SocialProfilePlatform.FACEBOOK &&
      (hostname === "facebook.com" || hostname === "fb.com")) ||
    (platform === SocialProfilePlatform.TIKTOK && hostname === "tiktok.com") ||
    (platform === SocialProfilePlatform.LINKEDIN &&
      hostname === "linkedin.com") ||
    (platform === SocialProfilePlatform.YOUTUBE &&
      (hostname === "youtube.com" || hostname === "youtu.be")) ||
    (platform === SocialProfilePlatform.X &&
      (hostname === "x.com" || hostname === "twitter.com"));

  if (!isValidForPlatform) {
    throw new BadRequestException(
      "Social profile URL does not match the selected platform.",
    );
  }
}

function isSafePublicHttpUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return false;
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    return !isPrivateIpv4(hostname);
  }

  if (ipVersion === 6) {
    return !isPrivateIpv6(hostname);
  }

  return hostname.length > 0;
}

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  const [first = 0, second = 0] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    const mappedAddress = normalized.slice("::ffff:".length);
    return isIP(mappedAddress) === 4 && isPrivateIpv4(mappedAddress);
  }

  const firstSegment = Number.parseInt(normalized.split(":")[0] ?? "", 16);
  return (
    Number.isFinite(firstSegment) &&
    ((firstSegment & 0xfe00) === 0xfc00 || (firstSegment & 0xffc0) === 0xfe80)
  );
}

function parseHomepageMetadata(
  metadata: Prisma.JsonValue | null | undefined,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      pageTitle: null,
      metaDescription: null,
      h1Count: 0,
      schemaTypes: [] as string[],
    };
  }

  const record = metadata as Record<string, unknown>;

  return {
    pageTitle:
      typeof record.pageTitle === "string" && record.pageTitle.trim()
        ? record.pageTitle
        : null,
    metaDescription:
      typeof record.metaDescription === "string" &&
      record.metaDescription.trim()
        ? record.metaDescription
        : null,
    h1Count: typeof record.h1Count === "number" ? record.h1Count : 0,
    schemaTypes: Array.isArray(record.schemaTypes)
      ? record.schemaTypes.filter(
          (schemaType): schemaType is string => typeof schemaType === "string",
        )
      : [],
  };
}

function auditPenaltyBySeverity(severity: WebsiteAuditFindingSeverity) {
  const penalties = {
    HIGH: 8,
    MEDIUM: 5,
    LOW: 2,
    INFO: 1,
  } satisfies Record<WebsiteAuditFindingSeverity, number>;

  return penalties[severity];
}

function countFindingsBySeverity(
  findings: Array<{ severity: WebsiteAuditFindingSeverity }>,
) {
  return findings.reduce(
    (counts, finding) => ({
      ...counts,
      [finding.severity]: counts[finding.severity] + 1,
    }),
    {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    } satisfies Record<WebsiteAuditFindingSeverity, number>,
  );
}

function recommendationPriorityFromSeverity(
  severity: WebsiteAuditFindingSeverity,
) {
  const priorities = {
    HIGH: BusinessRecommendationPriority.HIGH,
    MEDIUM: BusinessRecommendationPriority.MEDIUM,
    LOW: BusinessRecommendationPriority.LOW,
    INFO: BusinessRecommendationPriority.LOW,
  } satisfies Record<
    WebsiteAuditFindingSeverity,
    BusinessRecommendationPriority
  >;

  return priorities[severity];
}

function sortBusinessRecommendations<
  TRecommendation extends {
    priority: BusinessRecommendationPriority;
    status: BusinessRecommendationStatus;
    createdAt: Date;
  },
>(recommendations: TRecommendation[]) {
  const priorityRank = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  } satisfies Record<BusinessRecommendationPriority, number>;
  const statusRank = {
    OPEN: 0,
    DONE: 1,
    IGNORED: 2,
  } satisfies Record<BusinessRecommendationStatus, number>;

  return [...recommendations].sort((left, right) => {
    const statusDifference = statusRank[left.status] - statusRank[right.status];
    if (statusDifference !== 0) {
      return statusDifference;
    }

    const priorityDifference =
      priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gradeVisibilityScore(score: number) {
  if (score >= 90) {
    return "Excellent";
  }

  if (score >= 75) {
    return "Strong";
  }

  if (score >= 60) {
    return "Needs work";
  }

  if (score >= 40) {
    return "Weak";
  }

  return "Critical";
}

function visibilityScoreSummary(
  rawScore: number,
  score: number,
  grade: string,
  isMvpCapped: boolean,
) {
  const foundationLabel =
    rawScore === 100
      ? "perfect"
      : rawScore >= 75
        ? "strong"
        : rawScore >= 60
          ? "developing"
          : "early";
  const summary = `Foundation readiness is ${foundationLabel} at ${rawScore}/100 based on current deterministic website, local, social, and audit health checks. The displayed AI Visibility Score is ${score}/100 ${grade.toLowerCase()}.`;

  return isMvpCapped
    ? `${summary} Final displayed score is capped until advanced AI answer visibility checks are available.`
    : summary;
}

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
