import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Body,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { GoogleOAuthService } from "./google-oauth.service";
import { MetaOAuthService } from "./meta-oauth.service";
import { BusinessService } from "../business/business.service";
import { prisma, IntegrationProvider, ConnectionStatus } from "@brandos/database";

@Controller("oauth")
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly googleOAuth: GoogleOAuthService,
    private readonly metaOAuth: MetaOAuthService,
    private readonly business: BusinessService
  ) {}

  private async saveIntegration(
    businessId: string,
    provider: IntegrationProvider,
    data: {
      accountName: string;
      accessToken: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
      metricsCache?: any;
    }
  ) {
    const existing = await prisma.integrationAccount.findFirst({
      where: { businessId, provider },
    });

    if (existing) {
      return prisma.integrationAccount.update({
        where: { id: existing.id },
        data: {
          accountName: data.accountName,
          accessTokenEnc: data.accessToken,
          refreshTokenEnc: data.refreshToken ?? existing.refreshTokenEnc,
          tokenExpiresAt: data.tokenExpiresAt ?? existing.tokenExpiresAt,
          status: ConnectionStatus.CONNECTED,
          metricsCache: data.metricsCache ?? (existing.metricsCache as any),
          lastSyncedAt: new Date(),
        },
      });
    }

    return prisma.integrationAccount.create({
      data: {
        businessId,
        provider,
        accountName: data.accountName,
        accessTokenEnc: data.accessToken,
        refreshTokenEnc: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        status: ConnectionStatus.CONNECTED,
        metricsCache: data.metricsCache ?? null,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * 1. Google OAuth: Initiate Consent Flow
   */
  @Get("google/authorize")
  @UseGuards(AuthGuard)
  async googleAuthorize(
    @Req() req: any,
    @Res() res: any,
    @Query("returnUrl") returnUrl?: string
  ) {
    const biz = await this.business.get(req.user.id);
    const authUrl = this.googleOAuth.generateAuthUrl(biz.id, returnUrl);
    return res.redirect(authUrl);
  }

  /**
   * 2. Google OAuth: Callback Endpoint
   */
  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Res() res: any
  ) {
    const frontendBase = process.env.FRONTEND_URL || "https://brandoseye.com";

    if (error || !code) {
      this.logger.warn(`Google OAuth error or cancellation: ${error}`);
      return res.redirect(`${frontendBase}/dashboard/integrations?error=google_cancelled`);
    }

    try {
      let businessId = "";
      let returnPath = "/dashboard/integrations";
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        businessId = decoded.bId;
        returnPath = decoded.ret || returnPath;
      } catch {
        const defaultBiz = await prisma.business.findFirst();
        if (defaultBiz) businessId = defaultBiz.id;
      }

      if (!businessId) {
        throw new BadRequestException("No valid business found in OAuth state");
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      const siteUrl = business?.website || "https://brandoseye.com";

      // 1. Exchange tokens
      const tokens = await this.googleOAuth.exchangeCode(code);

      // 2. Fetch live metrics in parallel
      const [gscMetrics, ga4Metrics, gbpMetrics] = await Promise.all([
        this.googleOAuth.fetchGscMetrics(tokens.access_token, siteUrl),
        this.googleOAuth.fetchGa4Metrics(tokens.access_token),
        this.googleOAuth.fetchGbpMetrics(tokens.access_token),
      ]);

      const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

      // 3. Save Google Search Console, GA4 & GBP
      await Promise.all([
        this.saveIntegration(businessId, IntegrationProvider.GOOGLE_SEARCH_CONSOLE, {
          accountName: `${business?.name || "Your Business"} (Search Console)`,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          metricsCache: gscMetrics,
        }),
        this.saveIntegration(businessId, IntegrationProvider.GOOGLE_ANALYTICS_4, {
          accountName: `${business?.name || "Your Business"} (GA4)`,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          metricsCache: ga4Metrics,
        }),
        this.saveIntegration(businessId, IntegrationProvider.GOOGLE_BUSINESS_PROFILE, {
          accountName: `${business?.name || "Your Business"} (Google Maps)`,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          metricsCache: gbpMetrics,
        }),
      ]);

      this.logger.log(`Google OAuth completed successfully for business: ${businessId}`);
      return res.redirect(`${frontendBase}${returnPath}?success=google_connected`);
    } catch (err: any) {
      this.logger.error(`Google OAuth Callback Error: ${err.message}`, err.stack);
      return res.redirect(
        `${frontendBase}/dashboard/integrations?error=${encodeURIComponent(err.message)}`
      );
    }
  }

  /**
   * 3. Meta OAuth: Initiate Consent Flow
   */
  @Get("meta/authorize")
  @UseGuards(AuthGuard)
  async metaAuthorize(
    @Req() req: any,
    @Res() res: any,
    @Query("returnUrl") returnUrl?: string
  ) {
    const biz = await this.business.get(req.user.id);
    const authUrl = this.metaOAuth.generateAuthUrl(biz.id, returnUrl);
    return res.redirect(authUrl);
  }

  /**
   * 4. Meta OAuth: Callback Endpoint
   */
  @Get("meta/callback")
  async metaCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Res() res: any
  ) {
    const frontendBase = process.env.FRONTEND_URL || "https://brandoseye.com";

    if (error || !code) {
      this.logger.warn(`Meta OAuth error or cancellation: ${error}`);
      return res.redirect(`${frontendBase}/dashboard/integrations?error=meta_cancelled`);
    }

    try {
      let businessId = "";
      let returnPath = "/dashboard/integrations";
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        businessId = decoded.bId;
        returnPath = decoded.ret || returnPath;
      } catch {
        const defaultBiz = await prisma.business.findFirst();
        if (defaultBiz) businessId = defaultBiz.id;
      }

      if (!businessId) {
        throw new BadRequestException("No valid business found in OAuth state");
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });

      // 1. Exchange for 60-day long-lived token
      const tokens = await this.metaOAuth.exchangeCode(code);

      // 2. Fetch Facebook Page and insights
      const fbMetrics = await this.metaOAuth.fetchFacebookMetrics(tokens.access_token);

      // 3. Fetch Instagram metrics if linked
      let igMetrics = null;
      if (fbMetrics?.instagramAccountId && fbMetrics?.pageAccessToken) {
        igMetrics = await this.metaOAuth.fetchInstagramMetrics(
          fbMetrics.instagramAccountId,
          fbMetrics.pageAccessToken
        );
      }

      const expiresAt = new Date(Date.now() + (tokens.expires_in || 5184000) * 1000);

      // 4. Save Facebook Page & Instagram Insights
      await Promise.all([
        this.saveIntegration(businessId, IntegrationProvider.FACEBOOK_PAGE, {
          accountName: fbMetrics?.pageName || business?.name || "Facebook Page",
          accessToken: tokens.access_token,
          tokenExpiresAt: expiresAt,
          metricsCache: fbMetrics,
        }),
        this.saveIntegration(businessId, IntegrationProvider.INSTAGRAM_INSIGHTS, {
          accountName: `@${igMetrics?.username || business?.name || "Instagram"}`,
          accessToken: tokens.access_token,
          tokenExpiresAt: expiresAt,
          metricsCache: igMetrics,
        }),
      ]);

      this.logger.log(`Meta OAuth completed successfully for business: ${businessId}`);
      return res.redirect(`${frontendBase}${returnPath}?success=meta_connected`);
    } catch (err: any) {
      this.logger.error(`Meta OAuth Callback Error: ${err.message}`, err.stack);
      return res.redirect(
        `${frontendBase}/dashboard/integrations?error=${encodeURIComponent(err.message)}`
      );
    }
  }

  /**
   * 5. Get Active OAuth Configuration Status & Authorized Redirect URIs
   */
  @Get("credentials")
  @UseGuards(AuthGuard)
  async getCredentialsStatus() {
    return {
      google: {
        configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        clientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.slice(0, 12)}...` : "",
        redirectUri: process.env.GOOGLE_REDIRECT_URI || "https://brandoseye.com/api/oauth/google/callback",
      },
      meta: {
        configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
        appId: process.env.META_APP_ID ? `${process.env.META_APP_ID.slice(0, 6)}...` : "",
        redirectUri: process.env.META_REDIRECT_URI || "https://brandoseye.com/api/oauth/meta/callback",
      },
    };
  }
}
