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
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { CreateWebsiteDto } from "./dto/create-website.dto";
import { UpdateWebsiteDto } from "./dto/update-website.dto";
import {
  type BusinessSummary,
  type OrganizationDetail,
  type OrganizationSummary,
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
}
