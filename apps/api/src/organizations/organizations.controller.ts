import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { CreateGoogleBusinessProfileDto } from "./dto/create-google-business-profile.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { CreateSocialProfileDto } from "./dto/create-social-profile.dto";
import { CreateWebsiteDto } from "./dto/create-website.dto";
import { UpdateGoogleBusinessProfileDto } from "./dto/update-google-business-profile.dto";
import { UpdateSocialProfileDto } from "./dto/update-social-profile.dto";
import { UpdateBusinessRecommendationDto } from "./dto/update-business-recommendation.dto";
import { UpdateWebsiteAuditFindingDto } from "./dto/update-website-audit-finding.dto";
import { UpdateWebsiteDto } from "./dto/update-website.dto";
import {
  type BusinessRecommendationSummary,
  type BusinessSummary,
  type BusinessVisibilityScoreSummary,
  type GoogleBusinessProfileSummary,
  type OrganizationDetail,
  type OrganizationSummary,
  type SocialProfileSummary,
  type WebsiteAuditFindingSummary,
  type WebsiteCrawlSummary,
  type WebsiteSummary,
  OrganizationsService,
} from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  createOrganization(
    @Body() body: CreateOrganizationDto,
  ): Promise<OrganizationSummary> {
    return this.organizationsService.createOrganization(body);
  }

  @Get()
  listOrganizations(): Promise<OrganizationSummary[]> {
    return this.organizationsService.listOrganizations();
  }

  @Get(":organizationId")
  getOrganization(
    @Param("organizationId") organizationId: string,
  ): Promise<OrganizationDetail> {
    return this.organizationsService.getOrganization(organizationId);
  }

  @Post(":organizationId/businesses")
  createBusiness(
    @Param("organizationId") organizationId: string,
    @Body() body: CreateBusinessDto,
  ): Promise<BusinessSummary> {
    return this.organizationsService.createBusiness(organizationId, body);
  }

  @Get(":organizationId/businesses")
  listBusinesses(
    @Param("organizationId") organizationId: string,
  ): Promise<BusinessSummary[]> {
    return this.organizationsService.listBusinesses(organizationId);
  }

  @Get(":organizationId/businesses/:businessId/visibility-score")
  getBusinessVisibilityScore(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
  ): Promise<BusinessVisibilityScoreSummary | null> {
    return this.organizationsService.getBusinessVisibilityScore(
      organizationId,
      businessId,
    );
  }

  @Post(":organizationId/businesses/:businessId/visibility-score/calculate")
  calculateBusinessVisibilityScore(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
  ): Promise<BusinessVisibilityScoreSummary> {
    return this.organizationsService.calculateBusinessVisibilityScore(
      organizationId,
      businessId,
    );
  }

  @Get(":organizationId/businesses/:businessId/recommendations")
  listBusinessRecommendations(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
  ): Promise<BusinessRecommendationSummary[]> {
    return this.organizationsService.listBusinessRecommendations(
      organizationId,
      businessId,
    );
  }

  @Post(":organizationId/businesses/:businessId/recommendations/generate")
  generateBusinessRecommendations(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
  ): Promise<BusinessRecommendationSummary[]> {
    return this.organizationsService.generateBusinessRecommendations(
      organizationId,
      businessId,
    );
  }

  @Patch(":organizationId/businesses/:businessId/recommendations/:recommendationId")
  updateBusinessRecommendation(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("recommendationId") recommendationId: string,
    @Body() body: UpdateBusinessRecommendationDto,
  ): Promise<BusinessRecommendationSummary> {
    return this.organizationsService.updateBusinessRecommendation(
      organizationId,
      businessId,
      recommendationId,
      body,
    );
  }

  @Post(":organizationId/businesses/:businessId/websites")
  createWebsite(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Body() body: CreateWebsiteDto,
  ): Promise<WebsiteSummary> {
    return this.organizationsService.createWebsite(
      organizationId,
      businessId,
      body,
    );
  }

  @Get(":organizationId/businesses/:businessId/websites")
  listWebsites(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
  ): Promise<WebsiteSummary[]> {
    return this.organizationsService.listWebsites(organizationId, businessId);
  }

  @Patch(":organizationId/businesses/:businessId/websites/:websiteId")
  updateWebsite(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("websiteId") websiteId: string,
    @Body() body: UpdateWebsiteDto,
  ): Promise<WebsiteSummary> {
    return this.organizationsService.updateWebsite(
      organizationId,
      businessId,
      websiteId,
      body,
    );
  }

  @Delete(":organizationId/businesses/:businessId/websites/:websiteId")
  deleteWebsite(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("websiteId") websiteId: string,
  ): Promise<WebsiteSummary> {
    return this.organizationsService.deleteWebsite(
      organizationId,
      businessId,
      websiteId,
    );
  }

  @Get(":organizationId/businesses/:businessId/google-business-profile")
  getGoogleBusinessProfile(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
  ): Promise<GoogleBusinessProfileSummary | null> {
    return this.organizationsService.getGoogleBusinessProfile(
      organizationId,
      businessId,
    );
  }

  @Post(":organizationId/businesses/:businessId/google-business-profile")
  createGoogleBusinessProfile(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Body() body: CreateGoogleBusinessProfileDto,
  ): Promise<GoogleBusinessProfileSummary> {
    return this.organizationsService.createGoogleBusinessProfile(
      organizationId,
      businessId,
      body,
    );
  }

  @Patch(":organizationId/businesses/:businessId/google-business-profile")
  updateGoogleBusinessProfile(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Body() body: UpdateGoogleBusinessProfileDto,
  ): Promise<GoogleBusinessProfileSummary> {
    return this.organizationsService.updateGoogleBusinessProfile(
      organizationId,
      businessId,
      body,
    );
  }

  @Delete(":organizationId/businesses/:businessId/google-business-profile")
  deleteGoogleBusinessProfile(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
  ): Promise<GoogleBusinessProfileSummary> {
    return this.organizationsService.deleteGoogleBusinessProfile(
      organizationId,
      businessId,
    );
  }

  @Get(":organizationId/businesses/:businessId/social-profiles")
  listSocialProfiles(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
  ): Promise<SocialProfileSummary[]> {
    return this.organizationsService.listSocialProfiles(
      organizationId,
      businessId,
    );
  }

  @Post(":organizationId/businesses/:businessId/social-profiles")
  createSocialProfile(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Body() body: CreateSocialProfileDto,
  ): Promise<SocialProfileSummary> {
    return this.organizationsService.createSocialProfile(
      organizationId,
      businessId,
      body,
    );
  }

  @Patch(
    ":organizationId/businesses/:businessId/social-profiles/:socialProfileId",
  )
  updateSocialProfile(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("socialProfileId") socialProfileId: string,
    @Body() body: UpdateSocialProfileDto,
  ): Promise<SocialProfileSummary> {
    return this.organizationsService.updateSocialProfile(
      organizationId,
      businessId,
      socialProfileId,
      body,
    );
  }

  @Delete(
    ":organizationId/businesses/:businessId/social-profiles/:socialProfileId",
  )
  deleteSocialProfile(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("socialProfileId") socialProfileId: string,
  ): Promise<SocialProfileSummary> {
    return this.organizationsService.deleteSocialProfile(
      organizationId,
      businessId,
      socialProfileId,
    );
  }

  @Post(":organizationId/businesses/:businessId/websites/:websiteId/crawls")
  createWebsiteCrawl(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("websiteId") websiteId: string,
  ): Promise<WebsiteCrawlSummary> {
    return this.organizationsService.createWebsiteCrawl(
      organizationId,
      businessId,
      websiteId,
    );
  }

  @Get(":organizationId/businesses/:businessId/websites/:websiteId/crawls")
  listWebsiteCrawls(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("websiteId") websiteId: string,
  ): Promise<WebsiteCrawlSummary[]> {
    return this.organizationsService.listWebsiteCrawls(
      organizationId,
      businessId,
      websiteId,
    );
  }

  @Get(
    ":organizationId/businesses/:businessId/websites/:websiteId/crawls/:crawlId",
  )
  getWebsiteCrawl(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("websiteId") websiteId: string,
    @Param("crawlId") crawlId: string,
  ): Promise<WebsiteCrawlSummary> {
    return this.organizationsService.getWebsiteCrawl(
      organizationId,
      businessId,
      websiteId,
      crawlId,
    );
  }

  @Get(
    ":organizationId/businesses/:businessId/websites/:websiteId/audit-findings",
  )
  listWebsiteAuditFindings(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("websiteId") websiteId: string,
  ): Promise<WebsiteAuditFindingSummary[]> {
    return this.organizationsService.listWebsiteAuditFindings(
      organizationId,
      businessId,
      websiteId,
    );
  }

  @Patch(
    ":organizationId/businesses/:businessId/websites/:websiteId/audit-findings/:findingId",
  )
  updateWebsiteAuditFinding(
    @Param("organizationId") organizationId: string,
    @Param("businessId") businessId: string,
    @Param("websiteId") websiteId: string,
    @Param("findingId") findingId: string,
    @Body() body: UpdateWebsiteAuditFindingDto,
  ): Promise<WebsiteAuditFindingSummary> {
    return this.organizationsService.updateWebsiteAuditFinding(
      organizationId,
      businessId,
      websiteId,
      findingId,
      body,
    );
  }
}
