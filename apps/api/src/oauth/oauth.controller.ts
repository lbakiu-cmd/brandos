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
import { AuthGuard, COOKIE_NAME } from "../auth/auth.guard";
import { AuthService } from "../auth/auth.service";
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
    private readonly business: BusinessService,
    private readonly authService: AuthService
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
   * 1. Google OAuth: Get URL (JSON endpoint for SPA)
   */
  @Get("google/url")
  @UseGuards(AuthGuard)
  async getGoogleAuthUrl(
    @Req() req: any,
    @Query("returnUrl") returnUrl?: string,
    @Query("origin") customOrigin?: string
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    const host = req.headers?.["x-forwarded-host"] || req.headers?.["host"];
    const proto = req.headers?.["x-forwarded-proto"] || "https";
    const origin = customOrigin || (host ? `${proto}://${host}` : "https://icandothat.online");
    const redirectUri =
      process.env.GOOGLE_AUTH_REDIRECT_URI ||
      process.env.GOOGLE_REDIRECT_URI ||
      `${origin}/api/oauth/google/callback`;
    const authUrl = this.googleOAuth.generateAuthUrl(biz.id, returnUrl, redirectUri, origin);
    return { url: authUrl, redirectUri };
  }

  /**
   * 1b. Google OAuth: Initiate Consent Flow (Direct 302 Redirect)
   */
  @Get("google/authorize")
  @UseGuards(AuthGuard)
  async googleAuthorize(
    @Req() req: any,
    @Res() res: any,
    @Query("returnUrl") returnUrl?: string,
    @Query("origin") customOrigin?: string
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    const host = req.headers?.["x-forwarded-host"] || req.headers?.["host"];
    const proto = req.headers?.["x-forwarded-proto"] || "https";
    const origin = customOrigin || (host ? `${proto}://${host}` : "https://icandothat.online");
    const redirectUri =
      process.env.GOOGLE_AUTH_REDIRECT_URI ||
      process.env.GOOGLE_REDIRECT_URI ||
      `${origin}/api/oauth/google/callback`;
    const authUrl = this.googleOAuth.generateAuthUrl(biz.id, returnUrl, redirectUri, origin);
    
    // Explicit 302 redirect for Fastify + HTML fallback
    res.status(302);
    res.header("Location", authUrl);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${authUrl}">
          <script>window.location.href = "${authUrl}";</script>
        </head>
        <body>
          <p>Redirecting to Google...</p>
        </body>
      </html>
    `);
  }

  /**
   * 2. Google OAuth: Callback
   */
  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Req() req: any,
    @Res() res: any
  ) {
    const host = req.headers["x-forwarded-host"] || req.headers["host"];
    const proto = req.headers["x-forwarded-proto"] || "https";
    const frontendBase = host ? `${proto}://${host}` : (process.env.FRONTEND_URL || "https://icandothat.online");

    if (error || !code) {
      this.logger.warn(`Google OAuth error or cancellation: ${error}`);
      res.status(302);
      res.header("Location", `${frontendBase}/login?error=${encodeURIComponent(error || "google_cancelled")}`);
      return res.send();
    }

    try {
      let stateData: any = {};
      try {
        if (state) {
          stateData = JSON.parse(Buffer.from(state, "base64url").toString());
        }
      } catch (err) {
        this.logger.warn(`Could not parse OAuth state: ${state}`);
      }

      const targetOrigin = stateData.origin || frontendBase;

      // Check if this is a USER LOGIN / AUTHENTICATION request
      const isAuthFlow =
        stateData.auth === true ||
        stateData.purpose === "login" ||
        (!stateData.bId && !stateData.businessId);

      if (isAuthFlow) {
        this.logger.log(`Processing Google User Sign-In OAuth flow...`);
        const meta = {
          ip:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
            req.ip ||
            "127.0.0.1",
          userAgent: (req.headers["user-agent"] as string) || "Unknown Device",
        };

        const redirectUri =
          process.env.GOOGLE_AUTH_REDIRECT_URI ||
          process.env.GOOGLE_REDIRECT_URI ||
          `${targetOrigin}/api/oauth/google/callback`;

        const result = await this.authService.loginWithGoogle(
          { code, redirectUri },
          meta
        );

        if ((result as any).requires2fa) {
          const r = result as any;
          if (r.setupRequired) {
            this.logger.log(
              `Google user requires 2FA setup: ${r.user?.email} (${r.user?.id})`
            );
            res.status(302);
            res.header(
              "Location",
              `${targetOrigin}/login?setup2fa=1&tempToken=${encodeURIComponent(
                r.tempToken
              )}&secret=${encodeURIComponent(r.secret || "")}&email=${encodeURIComponent(
                r.user?.email || ""
              )}`
            );
            return res.send();
          } else {
            this.logger.log(
              `Google user requires 2FA challenge: ${r.user?.email} (${r.user?.id})`
            );
            res.status(302);
            res.header(
              "Location",
              `${targetOrigin}/login?verify2fa=1&tempToken=${encodeURIComponent(
                r.tempToken
              )}&email=${encodeURIComponent(r.user?.email || "")}`
            );
            return res.send();
          }
        }

        const destination = stateData.ret || "/dashboard";

        // If login was initiated from a different origin than this callback host, bridge the session cookie!
        if (stateData.origin && !stateData.origin.includes(host)) {
          this.logger.log(
            `Google user login successful: ${(result as any).user?.email}, bridging session to ${stateData.origin}`
          );
          res.status(302);
          res.header(
            "Location",
            `${stateData.origin}/api/auth/session-transfer?token=${encodeURIComponent(
              (result as any).token
            )}&returnUrl=${encodeURIComponent(destination)}`
          );
          return res.send();
        }

        if ((result as any).token) {
          // Set the secure session cookie on the reply
          res.setCookie(COOKIE_NAME, (result as any).token, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60,
          });
        }

        this.logger.log(
          `Google user login successful: ${(result as any).user?.email}, redirecting to ${destination}`
        );
        res.status(302);
        res.header("Location", `${frontendBase}${destination}`);
        return res.send();
      }

      // Otherwise, this is a Business Integrations OAuth flow
      const businessId = stateData.bId || stateData.businessId;
      const returnPath = stateData.ret || "/dashboard/integrations";

      if (!businessId) {
        throw new BadRequestException("No valid business found in OAuth state");
      }

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      const siteUrl = business?.website || targetOrigin;

      const redirectUri =
        process.env.GOOGLE_AUTH_REDIRECT_URI ||
        process.env.GOOGLE_REDIRECT_URI ||
        `${targetOrigin}/api/oauth/google/callback`;

      // 1. Exchange tokens
      const tokens = await this.googleOAuth.exchangeCode(code, redirectUri);

      // 2. Fetch live metrics in parallel, filtering precisely by the business domain and name
      const [gscMetrics, ga4Metrics, gbpMetrics] = await Promise.all([
        this.googleOAuth.fetchGscMetrics(tokens.access_token, siteUrl),
        this.googleOAuth.fetchGa4Metrics(tokens.access_token, siteUrl, business?.name),
        this.googleOAuth.fetchGbpMetrics(tokens.access_token, business?.name, siteUrl, business?.city, 28, businessId),
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
      res.status(302);
      res.header("Location", `${frontendBase}${returnPath}?success=google_connected`);
      return res.send();
    } catch (err: any) {
      this.logger.error(`Google OAuth Callback Error: ${err.message}`, err.stack);
      res.status(302);
      res.header("Location", `${frontendBase}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
      return res.send();
    }
  }

  /**
   * 3. Meta OAuth: Get URL (JSON endpoint for SPA)
   */
  @Get("meta/url")
  @UseGuards(AuthGuard)
  async getMetaAuthUrl(@Req() req: any, @Query("returnUrl") returnUrl?: string) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    const authUrl = this.metaOAuth.generateAuthUrl(biz.id, returnUrl);
    return { url: authUrl };
  }

  /**
   * 3b. Meta OAuth: Initiate Consent Flow (Direct 302 Redirect)
   */
  @Get("meta/authorize")
  @UseGuards(AuthGuard)
  async metaAuthorize(
    @Req() req: any,
    @Res() res: any,
    @Query("returnUrl") returnUrl?: string
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    const authUrl = this.metaOAuth.generateAuthUrl(biz.id, returnUrl);
    res.status(302);
    res.header("Location", authUrl);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${authUrl}">
          <script>window.location.href = "${authUrl}";</script>
        </head>
        <body>
          <p>Redirecting to Meta Sign-In... <a href="${authUrl}">Click here if not redirected automatically</a>.</p>
        </body>
      </html>
    `);
  }

  /**
   * 4. Meta OAuth & Webhook Verification Endpoint
   */
  @Get("meta/callback")
  @Get("meta/webhook")
  async metaCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Req() req: any,
    @Res() res: any
  ) {
    // 0. Meta Webhook Verification Challenge (hub.mode, hub.challenge, hub.verify_token)
    const hubMode = req.query?.["hub.mode"] || req.query?.hub_mode;
    const hubChallenge = req.query?.["hub.challenge"] || req.query?.hub_challenge;
    const hubVerifyToken = req.query?.["hub.verify_token"] || req.query?.hub_verify_token;

    if (hubMode === "subscribe" && hubChallenge) {
      const configuredToken = process.env.META_VERIFY_TOKEN || "aivisibility_meta_verify_2026";
      this.logger.log(`Received Meta Webhook subscription verification with token: "${hubVerifyToken}"`);

      // Accept configured token, fallback tokens, or any non-empty token if none configured
      if (
        !process.env.META_VERIFY_TOKEN ||
        hubVerifyToken === configuredToken ||
        hubVerifyToken === "brandos" ||
        hubVerifyToken === "aivisibility_meta_verify_2026"
      ) {
        this.logger.log(`Meta Webhook verified successfully! Responding with challenge: ${hubChallenge}`);
        res.status(200);
        res.type("text/plain");
        return res.send(String(hubChallenge));
      }

      this.logger.warn(`Meta Webhook verification token mismatch: "${hubVerifyToken}" vs "${configuredToken}"`);
      return res.status(403).send("Verification token mismatch");
    }

    const host = req.headers?.["x-forwarded-host"] || req.headers?.["host"];
    const proto = req.headers?.["x-forwarded-proto"] || "https";
    const frontendBase = host ? `${proto}://${host}` : (process.env.FRONTEND_URL || "https://icandothat.online");

    if (error || !code) {
      this.logger.warn(`Meta OAuth error or cancellation: ${error}`);
      res.status(302);
      res.header("Location", `${frontendBase}/dashboard/integrations?error=meta_cancelled`);
      return res.send();
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
      res.status(302);
      res.header("Location", `${frontendBase}${returnPath}?success=meta_connected`);
      return res.send();
    } catch (err: any) {
      this.logger.error(`Meta OAuth Callback Error: ${err.message}`, err.stack);
      res.status(302);
      res.header("Location", `${frontendBase}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
      return res.send();
    }
  }

  /**
   * 4b. Meta Webhook Event Ingestion (POST)
   */
  @Post("meta/callback")
  @Post("meta/webhook")
  async handleMetaWebhookEvent(@Req() req: any, @Res() res: any) {
    this.logger.log(`Received Meta Webhook event: ${JSON.stringify(req.body)?.slice(0, 300)}`);
    return res.status(200).send({ status: "received", timestamp: new Date().toISOString() });
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
        redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.DOMAIN || "https://icandothat.online"}/api/oauth/google/callback`,
      },
      meta: {
        configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
        appId: process.env.META_APP_ID ? `${process.env.META_APP_ID.slice(0, 6)}...` : "",
        redirectUri: process.env.META_REDIRECT_URI || `${process.env.DOMAIN || "https://icandothat.online"}/api/oauth/meta/callback`,
      },
    };
  }
}
