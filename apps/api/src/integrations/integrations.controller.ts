import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { IntegrationsService, ConnectPayload } from "./integrations.service";
import { BusinessService } from "../business/business.service";
import { GoogleOAuthService } from "../oauth/google-oauth.service";
import { IntegrationProvider, prisma } from "@brandos/database";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly business: BusinessService,
    private readonly googleOAuth: GoogleOAuthService
  ) {}

  /**
   * Get all connected platforms & available channels
   */
  @Get("status")
  @UseGuards(AuthGuard)
  async getStatus(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    return this.integrations.getStatus(biz.id);
  }

  /**
   * Get all verified domains/sites from connected Google Search Console
   */
  @Get("google/sites")
  @UseGuards(AuthGuard)
  async getGoogleSites(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    const sites = await this.googleOAuth.getSitesList(biz.id);
    return {
      sites,
      currentWebsite: biz.website,
      businessName: biz.name,
    };
  }

  /**
   * Query real-time Search Console telemetry for a selected site
   */
  @Get("google/search-analytics")
  @UseGuards(AuthGuard)
  async getSearchAnalytics(
    @Req() req: any,
    @Query("siteUrl") siteUrl?: string,
    @Query("days") days?: string
  ) {
    const biz = await this.business.get(req.user.id);
    const token = await this.googleOAuth.getFreshAccessToken(biz.id);
    if (!token) {
      throw new BadRequestException("Google Search Console is not connected.");
    }

    const target = siteUrl || biz.website || "https://brandoseye.com";
    const dayCount = days ? parseInt(days, 10) : 28;

    const metrics = await this.googleOAuth.fetchGscMetrics(token, target, dayCount);
    if (!metrics) {
      throw new BadRequestException(`Could not query search analytics for ${target}`);
    }

    return metrics;
  }

  /**
   * Select active domain/site to monitor across BrandOS
   */
  @Post("select-site")
  @UseGuards(AuthGuard)
  async selectSite(
    @Req() req: any,
    @Body() body: { siteUrl: string; domain?: string }
  ) {
    if (!body.siteUrl) {
      throw new BadRequestException("siteUrl is required");
    }

    const biz = await this.business.get(req.user.id);
    const cleanDomain = body.domain || body.siteUrl
      .replace("sc-domain:", "")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    // Update business website
    await prisma.business.update({
      where: { id: biz.id },
      data: {
        website: `https://${cleanDomain}`,
      },
    });

    // Fetch and cache live search analytics for this domain
    const token = await this.googleOAuth.getFreshAccessToken(biz.id);
    if (token) {
      const metrics = await this.googleOAuth.fetchGscMetrics(token, body.siteUrl);
      if (metrics) {
        await prisma.integrationAccount.updateMany({
          where: { businessId: biz.id, provider: IntegrationProvider.GOOGLE_SEARCH_CONSOLE },
          data: { metricsCache: metrics as any, lastSyncedAt: new Date() },
        });
      }
    }

    return {
      success: true,
      selectedSite: body.siteUrl,
      website: `https://${cleanDomain}`,
      message: `Active domain switched to ${cleanDomain}`,
    };
  }

  /**
   * Connect platform via OAuth or 1-Click Simulated Link
   */
  @Post("connect/:provider")
  @UseGuards(AuthGuard)
  async connect(
    @Req() req: any,
    @Param("provider") provider: string,
    @Body() body: ConnectPayload
  ) {
    const validProvider = provider.toUpperCase() as IntegrationProvider;
    if (!Object.values(IntegrationProvider).includes(validProvider)) {
      throw new BadRequestException(`Invalid integration provider: ${provider}`);
    }

    const biz = await this.business.get(req.user.id);
    return this.integrations.connect(biz.id, validProvider, body);
  }

  /**
   * Disconnect integration
   */
  @Post("disconnect/:provider")
  @UseGuards(AuthGuard)
  async disconnect(@Req() req: any, @Param("provider") provider: string) {
    const validProvider = provider.toUpperCase() as IntegrationProvider;
    const biz = await this.business.get(req.user.id);
    return this.integrations.disconnect(biz.id, validProvider);
  }

  /**
   * Sync telemetry & fresh metrics
   */
  @Post("sync/:provider")
  @UseGuards(AuthGuard)
  async sync(@Req() req: any, @Param("provider") provider: string) {
    const validProvider = provider.toUpperCase() as IntegrationProvider;
    const biz = await this.business.get(req.user.id);
    return this.integrations.sync(biz.id, validProvider);
  }
}
