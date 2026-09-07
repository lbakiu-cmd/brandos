import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { prisma, IntegrationProvider, ConnectionStatus } from "@brandos/database";

export type ConnectPayload = {
  accountName?: string;
  externalId?: string;
  accessToken?: string;
  refreshToken?: string;
  scopes?: string;
  isDemo?: boolean;
};

export type BusinessInfo = {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
};

@Injectable()
export class IntegrationsService {
  /**
   * Get all connected platforms & available catalog for a business
   */
  async getStatus(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { integrations: true },
    });

    if (!business) throw new NotFoundException("Business not found.");

    // Standard list of supported integrations
    const supportedProviders = [
      {
        provider: "GOOGLE_SEARCH_CONSOLE",
        name: "Google Search Console",
        category: "Google",
        description: "Organic search queries, impressions, clicks, CTR, and indexing status.",
        icon: "Search",
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        metricsAvailable: ["Queries", "Clicks", "Impressions", "CTR", "Average Position"],
      },
      {
        provider: "GOOGLE_ANALYTICS_4",
        name: "Google Analytics 4",
        category: "Google",
        description: "AI search engine referrals (ChatGPT, Perplexity, Claude, Gemini) and user traffic.",
        icon: "BarChart3",
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        metricsAvailable: ["Total Users", "Sessions", "AI Referrals", "Top Landing Pages"],
      },
      {
        provider: "GOOGLE_BUSINESS_PROFILE",
        name: "Google Business Profile",
        category: "Google",
        description: "Local search rank, map views, calls, directions, and customer review stream.",
        icon: "MapPin",
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        metricsAvailable: ["Search Views", "Map Views", "Call Actions", "Reviews", "Rating"],
      },
      {
        provider: "WORDPRESS",
        name: "WordPress (AIVision SEO)",
        category: "CMS",
        description: "On-site 1-click execution engine for robots.txt, dynamic /llms.txt, schema, and AI publisher.",
        icon: "Plug",
        color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        metricsAvailable: ["SEO Score", "AEO Score", "GEO Score", "Schema Validated", "LLMs.txt"],
      },
      {
        provider: "FACEBOOK_PAGE",
        name: "Facebook Pages",
        category: "Social Analytics",
        description: "Page reach, total likes, post engagement, and brand follower growth.",
        icon: "Facebook",
        color: "text-blue-500 bg-blue-600/10 border-blue-600/20",
        metricsAvailable: ["Page Reach", "Total Followers", "Engagement Rate", "Impressions"],
      },
      {
        provider: "INSTAGRAM_INSIGHTS",
        name: "Instagram Professional",
        category: "Social Analytics",
        description: "Audience demographics, profile interactions, reach, and story insights.",
        icon: "Instagram",
        color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
        metricsAvailable: ["Profile Visits", "Reach", "Followers", "Audience Breakdown"],
      },
      {
        provider: "LINKEDIN_COMPANY",
        name: "LinkedIn Company",
        category: "Social Analytics",
        description: "B2B brand authority, follower demographics, and post impressions.",
        icon: "Linkedin",
        color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
        metricsAvailable: ["Followers", "Page Views", "Engagement", "Visitor Demographics"],
      },
    ];

    const connectedMap = new Map(business.integrations.map((i) => [i.provider, i]));

    const integrations = supportedProviders.map((sp) => {
      const existing = connectedMap.get(sp.provider as IntegrationProvider);
      const isConnected = !!existing && existing.status === ConnectionStatus.CONNECTED;
      const isWpConnected = sp.provider === "WORDPRESS" && Boolean(business.wordpressConnectedAt);

      const effectiveMetrics = isConnected
        ? existing?.metricsCache || null
        : isWpConnected
        ? business.wordpressTelemetry || null
        : null;

      return {
        ...sp,
        connected: isConnected || isWpConnected,
        accountName:
          existing?.accountName ||
          (sp.provider === "WORDPRESS"
            ? business.wordpressSiteName || business.website || "WordPress Site"
            : isConnected
            ? `${business.name} (${sp.name})`
            : null),
        status: isConnected || isWpConnected ? "CONNECTED" : "DISCONNECTED",
        lastSyncedAt: existing?.lastSyncedAt || (isWpConnected ? business.wordpressLastSyncedAt : null),
        metricsCache: effectiveMetrics,
      };
    });

    return {
      businessId: business.id,
      businessName: business.name,
      website: business.website,
      industry: business.industry,
      city: business.city,
      integrations,
    };
  }

  /**
   * Connect platform via OAuth or API Key
   */
  async connect(businessId: string, provider: IntegrationProvider, payload: ConnectPayload) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException("Business not found.");

    if (!payload.accessToken) {
      throw new BadRequestException("Valid access token or credentials required.");
    }

    const existing = await prisma.integrationAccount.findFirst({
      where: { businessId, provider },
    });

    if (existing) {
      return prisma.integrationAccount.update({
        where: { id: existing.id },
        data: {
          accountName: payload.accountName || `${business.name} (${provider})`,
          externalId: payload.externalId || `ext_${Date.now()}`,
          accessTokenEnc: payload.accessToken,
          refreshTokenEnc: payload.refreshToken,
          scopes: payload.scopes || "read:analytics",
          status: ConnectionStatus.CONNECTED,
          lastSyncedAt: new Date(),
        },
      });
    }

    return prisma.integrationAccount.create({
      data: {
        businessId,
        provider,
        accountName: payload.accountName || `${business.name} (${provider})`,
        externalId: payload.externalId || `ext_${Date.now()}`,
        accessTokenEnc: payload.accessToken,
        refreshTokenEnc: payload.refreshToken,
        scopes: payload.scopes || "read:analytics",
        status: ConnectionStatus.CONNECTED,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Disconnect integration
   */
  async disconnect(businessId: string, provider: IntegrationProvider) {
    await prisma.integrationAccount.deleteMany({
      where: { businessId, provider },
    });

    return { success: true, message: `${provider} successfully disconnected.` };
  }

  /**
   * Trigger telemetry & metrics sync for a provider
   */
  async sync(businessId: string, provider: IntegrationProvider) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException("Business not found.");

    const existing = await prisma.integrationAccount.findFirst({
      where: { businessId, provider },
    });

    if (!existing) {
      throw new BadRequestException(`${provider} is not connected.`);
    }

    await prisma.integrationAccount.update({
      where: { id: existing.id },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `${provider} synchronization updated.`,
      metrics: existing.metricsCache || null,
    };
  }

  /**
   * Re-sync all integration metrics for a business (called after business name / website update)
   */
  async refreshAllMetricsForBusiness(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { integrations: true },
    });
    if (!business) return;

    for (const integration of business.integrations) {
      await prisma.integrationAccount.update({
        where: { id: integration.id },
        data: {
          accountName: `${business.name} (${integration.provider})`,
          lastSyncedAt: new Date(),
        },
      });
    }
  }
}
