import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Business, Membership, Organization } from "@brandos/database";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  createOrganization(
    @Body() body: CreateOrganizationDto,
  ): Promise<Organization & { memberships: Membership[] }> {
    return this.organizationsService.createOrganization(body);
  }

  @Get(":organizationId")
  getOrganization(
    @Param("organizationId") organizationId: string,
  ): Promise<Organization & { businesses: Business[] }> {
    return this.organizationsService.getOrganization(organizationId);
  }

  @Post(":organizationId/businesses")
  createBusiness(
    @Param("organizationId") organizationId: string,
    @Body() body: CreateBusinessDto,
  ): Promise<Business> {
    return this.organizationsService.createBusiness(organizationId, body);
  }

  @Get(":organizationId/businesses")
  listBusinesses(
    @Param("organizationId") organizationId: string,
  ): Promise<Business[]> {
    return this.organizationsService.listBusinesses(organizationId);
  }
}
