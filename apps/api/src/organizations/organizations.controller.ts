import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import {
  type BusinessSummary,
  type OrganizationDetail,
  type OrganizationSummary,
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
}
