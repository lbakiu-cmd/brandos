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
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.integrations.getStatus(biz.id);
  }

  @Get("google/analytics")
  @UseGuards(AuthGuard)
  async getAnalytics(@Req() req: any, @Query("days") days = "7") {
    const dayCount = Number(days);
    if (!/^[0-9]+$/.test(days) || ![0, 7, 14, 28, 30, 90, 365].includes(dayCount)) {
      throw new BadRequestException("Unsupported analytics date range.");
    }
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    const token = await this.googleOAuth.getFreshAccessToken(biz.id, IntegrationProvider.GOOGLE_ANALYTICS_4);
    if (!token) throw new BadRequestException("Google Analytics is not connected.");
    const metrics = await this.googleOAuth.fetchGa4Metrics(token, biz.website || undefined, biz.name, dayCount);
    if (!metrics) throw new BadRequestException("Google Analytics data is unavailable for this business and date range.");
    return metrics;
  }

  @Get("google/gbp")
  @UseGuards(AuthGuard)
  async getGbp(@Req() req: any, @Query("days") days = "28") {
    const dayCount = Number(days);
    if (!/^[0-9]+$/.test(days) || ![0, 7, 14, 28, 30, 90, 365].includes(dayCount)) {
      throw new BadRequestException("Unsupported analytics date range.");
    }
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    const token = await this.googleOAuth.getFreshAccessToken(biz.id, IntegrationProvider.GOOGLE_BUSINESS_PROFILE);
    if (!token) throw new BadRequestException("Google Business Profile is not connected.");
    const metrics = await this.googleOAuth.fetchGbpMetrics(token, biz.name, biz.website || undefined, biz.city || undefined, dayCount, biz.id);
    if (!metrics) throw new BadRequestException("Google Business Profile data is unavailable for this business and date range.");
    return metrics;
  }

  /**
   * Get all verified domains/sites from connected Google Search Console
   */
  @Get("google/sites")
  @UseGuards(AuthGuard)
  async getGoogleSites(@Req() req: any) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
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
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    const token = await this.googleOAuth.getFreshAccessToken(biz.id);
    if (!token) {
      throw new BadRequestException("Google Search Console is not connected.");
    }

    const target = siteUrl || biz.website || "https://icandothat.online";
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

    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
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

    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.integrations.connect(biz.id, validProvider, body);
  }

  /**
   * Disconnect integration
   */
  @Post("disconnect/:provider")
  @UseGuards(AuthGuard)
  async disconnect(@Req() req: any, @Param("provider") provider: string) {
    const validProvider = provider.toUpperCase() as IntegrationProvider;
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.integrations.disconnect(biz.id, validProvider);
  }

  /**
   * Sync telemetry & fresh metrics
   */
  @Post("sync/:provider")
  @UseGuards(AuthGuard)
  async sync(@Req() req: any, @Param("provider") provider: string) {
    const validProvider = provider.toUpperCase() as IntegrationProvider;
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.integrations.sync(biz.id, validProvider);
  }
}
