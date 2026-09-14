import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, WidgetType, WidgetCategory, IntegrationProvider } from "@brandos/database";
import { IntegrationsService } from "../integrations/integrations.service";

export type WidgetCatalogItem = {
  type: WidgetType;
  title: string;
  category: WidgetCategory;
  description: string;
  icon: string;
  defaultWidth: number; // 1, 2, or 3 cols
  providerRequired?: IntegrationProvider;
  tags: string[];
};

@Injectable()
export class WidgetsService {
  constructor(private readonly integrations: IntegrationsService) {}

  /**
   * Get catalog of all available widget templates (Cyfe-style)
   */
  getCatalog(): WidgetCatalogItem[] {
    return [
      // Popular
      {
        type: WidgetType.GSC_QUERIES_TABLE,
        title: "Google Search Console — Top Queries",
        category: WidgetCategory.GOOGLE,
        description: "Top organic search keywords, clicks, impressions, CTR, and average position.",
        icon: "Search",
        defaultWidth: 2,
        providerRequired: IntegrationProvider.GOOGLE_SEARCH_CONSOLE,
        tags: ["SEO", "Google", "Rankings", "Clicks"],
      },
      {
        type: WidgetType.GA4_AI_TRAFFIC,
        title: "GA4 — AI Search Engine Traffic",
        category: WidgetCategory.AI_DISCOVERY,
        description: "Referrals and conversions originating from ChatGPT, Perplexity, Claude, and Gemini.",
        icon: "Bot",
        defaultWidth: 2,
        providerRequired: IntegrationProvider.GOOGLE_ANALYTICS_4,
        tags: ["AEO", "AI", "Traffic", "Referrals"],
      },
      {
        type: WidgetType.GBP_LOCAL_PERFORMANCE,
        title: "Google Business Profile — Local Map & Search",
        category: WidgetCategory.GOOGLE,
        description: "Search impressions, map views, phone call actions, and direction requests.",
        icon: "MapPin",
        defaultWidth: 2,
        providerRequired: IntegrationProvider.GOOGLE_BUSINESS_PROFILE,
        tags: ["Local SEO", "Maps", "Calls", "Google"],
      },
      {
        type: WidgetType.AEO_CITATION_SHARE,
        title: "AEO / GEO — AI Citation Share of Voice",
        category: WidgetCategory.AI_DISCOVERY,
        description: "Brand visibility & citation probability across ChatGPT, Perplexity, Gemini, and Claude.",
        icon: "Sparkles",
        defaultWidth: 1,
        tags: ["AEO", "GEO", "ChatGPT", "Perplexity"],
      },
      {
        type: WidgetType.GBP_REVIEWS_FEED,
        title: "Google Reviews & AI Auto-Reply Feed",
        category: WidgetCategory.REVIEWS,
        description: "Live Google reviews with sentiment scoring and 1-click AI reply drafting.",
        icon: "Star",
        defaultWidth: 2,
        providerRequired: IntegrationProvider.GOOGLE_BUSINESS_PROFILE,
        tags: ["Reviews", "Reputation", "AI Reply"],
      },
      {
        type: WidgetType.SEO_HEALTH_GAUGE,
        title: "Technical SEO & Schema Health",
        category: WidgetCategory.SEO,
        description: "Core Web Vitals, Schema.org coverage, robots.txt, and /llms.txt audit status.",
        icon: "ShieldCheck",
        defaultWidth: 1,
        tags: ["SEO", "Schema", "Audit"],
      },
      {
        type: WidgetType.WORDPRESS_AIVISION_STATUS,
        title: "WordPress AIVision SEO Live Telemetry",
        category: WidgetCategory.CUSTOM,
        description: "Connected site scores, schema injection state, and 1-click remote fix status.",
        icon: "Plug",
        defaultWidth: 2,
        providerRequired: IntegrationProvider.WORDPRESS,
        tags: ["WordPress", "Plugin", "AIVision"],
      },
      {
        type: WidgetType.META_PAGE_REACH,
        title: "Facebook Page Reach & Engagement",
        category: WidgetCategory.SOCIAL_ANALYTICS,
        description: "Page impressions, reach, total likes, and post engagement rates.",
        icon: "Facebook",
        defaultWidth: 1,
        providerRequired: IntegrationProvider.FACEBOOK_PAGE,
        tags: ["Social", "Meta", "Reach"],
      },
      {
        type: WidgetType.INSTAGRAM_AUDIENCE,
        title: "Instagram Audience & Profile Visits",
        category: WidgetCategory.SOCIAL_ANALYTICS,
        description: "Follower growth, profile interactions, reach, and demographic insights.",
        icon: "Instagram",
        defaultWidth: 1,
        providerRequired: IntegrationProvider.INSTAGRAM_INSIGHTS,
        tags: ["Social", "Instagram", "Followers"],
      },
      {
        type: WidgetType.LINKEDIN_PAGE_STATS,
        title: "LinkedIn Company Authority & Followers",
        category: WidgetCategory.SOCIAL_ANALYTICS,
        description: "Follower growth, page views, visitor demographics, and CTR.",
        icon: "Linkedin",
        defaultWidth: 1,
        providerRequired: IntegrationProvider.LINKEDIN_COMPANY,
        tags: ["Social", "LinkedIn", "B2B"],
      },
    ];
  }

  /**
   * Get active dashboard widgets for a business populated with live metrics
   */
  async getWidgets(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException("Business not found.");

    let widgets = await prisma.dashboardWidget.findMany({
      where: { businessId, enabled: true },
      orderBy: { position: "asc" },
    });

    // If no widgets exist yet for this business, initialize standard default layout
    if (widgets.length === 0) {
      await this.initDefaultWidgets(businessId);
      widgets = await prisma.dashboardWidget.findMany({
        where: { businessId, enabled: true },
        orderBy: { position: "asc" },
      });
    }

    // Fetch integrations status to enrich widgets with live data
    const integrationsStatus = await this.integrations.getStatus(businessId);
    const integrationsMap = new Map(
      integrationsStatus.integrations.map((i) => [i.provider, i])
    );

    // Fetch latest website audit score
    const latestAudit = await prisma.websiteAudit.findFirst({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });

    // Enrich each widget with live or computed metric data
    return widgets.map((w) => {
      const liveData = this.computeWidgetData(w.widgetType, integrationsMap, latestAudit, business);
      return {
        ...w,
        data: liveData,
      };
    });
  }

  /**
   * Initialize default high-impact widgets for a new account
   */
  async initDefaultWidgets(businessId: string) {
    const defaults = [
      {
        widgetType: WidgetType.GSC_QUERIES_TABLE,
        title: "Google Search Console — Top Queries",
        category: WidgetCategory.GOOGLE,
        position: 0,
        width: 2,
      },
      {
        widgetType: WidgetType.GA4_AI_TRAFFIC,
        title: "GA4 — AI Search Engine Traffic",
        category: WidgetCategory.AI_DISCOVERY,
        position: 1,
        width: 2,
      },
      {
        widgetType: WidgetType.AEO_CITATION_SHARE,
        title: "AEO / GEO — Citation Share",
        category: WidgetCategory.AI_DISCOVERY,
        position: 2,
        width: 1,
      },
      {
        widgetType: WidgetType.SEO_HEALTH_GAUGE,
        title: "Technical SEO & Schema Health",
        category: WidgetCategory.SEO,
        position: 3,
        width: 1,
      },
      {
        widgetType: WidgetType.GBP_LOCAL_PERFORMANCE,
        title: "Google Business Profile — Local Map & Search",
        category: WidgetCategory.GOOGLE,
        position: 4,
        width: 2,
      },
      {
        widgetType: WidgetType.GBP_REVIEWS_FEED,
        title: "Google Reviews & Auto-Reply",
        category: WidgetCategory.REVIEWS,
        position: 5,
        width: 2,
      },
      {
        widgetType: WidgetType.WORDPRESS_AIVISION_STATUS,
        title: "WordPress AIVision SEO Live Telemetry",
        category: WidgetCategory.CUSTOM,
        position: 6,
        width: 2,
      },
    ];

    for (const d of defaults) {
      await prisma.dashboardWidget.create({
        data: {
          businessId,
          widgetType: d.widgetType,
          title: d.title,
          category: d.category,
          position: d.position,
          width: d.width,
          enabled: true,
        },
      });
    }
  }

  /**
   * Add a new widget from catalog to dashboard
   */
  async addWidget(
    businessId: string,
    payload: {
      widgetType: WidgetType;
      title?: string;
      category?: WidgetCategory;
      width?: number;
      config?: any;
    }
  ) {
    const count = await prisma.dashboardWidget.count({ where: { businessId } });
    const catalogItem = this.getCatalog().find((c) => c.type === payload.widgetType);

    return prisma.dashboardWidget.create({
      data: {
        businessId,
        widgetType: payload.widgetType,
        title: payload.title || catalogItem?.title || "Custom Widget",
        category: payload.category || catalogItem?.category || WidgetCategory.POPULAR,
        position: count,
        width: payload.width || catalogItem?.defaultWidth || 1,
        config: payload.config,
        enabled: true,
      },
    });
  }

  /**
   * Update widget layout or configuration
   */
  async updateWidget(
    widgetId: string,
    data: { title?: string; width?: number; position?: number; enabled?: boolean; config?: any }
  ) {
    const existing = await prisma.dashboardWidget.findUnique({ where: { id: widgetId } });
    if (!existing) throw new NotFoundException("Widget not found.");

    return prisma.dashboardWidget.update({
      where: { id: widgetId },
      data,
    });
  }

  /**
   * Delete a widget from the dashboard
   */
  async deleteWidget(widgetId: string) {
    await prisma.dashboardWidget.delete({ where: { id: widgetId } });
    return { success: true, message: "Widget removed from dashboard." };
  }

  /**
   * Compute live data payload for widget rendering
   */
  private computeWidgetData(
    widgetType: WidgetType,
    integrationsMap: Map<string, any>,
    latestAudit: any,
    business: any
  ) {
    const bName = business?.name || "Your Business";
    const bCity = business?.city || "your area";
    const bIndustry = business?.industry || "services";
    const bSite = business?.website || business?.wordpressUrl || `https://${bName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

    switch (widgetType) {
      case WidgetType.GSC_QUERIES_TABLE:
      case WidgetType.GSC_CLICKS_IMPRESSIONS: {
        const gsc = integrationsMap.get("GOOGLE_SEARCH_CONSOLE");
        return gsc?.metricsCache || null;
      }

      case WidgetType.GA4_AI_TRAFFIC:
      case WidgetType.GA4_TOP_PAGES: {
        const ga4 = integrationsMap.get("GOOGLE_ANALYTICS_4");
        return ga4?.metricsCache?.measurementVersion === 2 ? ga4.metricsCache : null;
      }

      case WidgetType.GBP_LOCAL_PERFORMANCE:
      case WidgetType.GBP_REVIEWS_FEED: {
        const gbp = integrationsMap.get("GOOGLE_BUSINESS_PROFILE");
        return gbp?.metricsCache || null;
      }

      case WidgetType.AEO_CITATION_SHARE:
      case WidgetType.AEO_PROMPT_RANKINGS: {
        return {
          businessName: bName,
          compositeScore: null,
          citationGrowth: null,
          engineShare: [],
          recentProbes: [],
        };
      }

      case WidgetType.SEO_HEALTH_GAUGE: {
        if (!latestAudit) {
          return {
            businessName: bName,
            siteUrl: bSite,
            score: null,
            lcp: null,
            cls: null,
            schemaTypes: [],
            llmsTxtStatus: "Not Generated",
            robotsStatus: "Pending Audit",
          };
        }
        return {
          businessName: bName,
          siteUrl: bSite,
          score: latestAudit.score || 0,
          lcp: latestAudit.lcp || null,
          cls: latestAudit.cls || null,
          schemaTypes: latestAudit.schemaTypes || [],
          llmsTxtStatus: latestAudit.llmsTxtStatus || "Active",
          robotsStatus: latestAudit.robotsStatus || "Default",
        };
      }

      case WidgetType.WORDPRESS_AIVISION_STATUS: {
        const wp = integrationsMap.get("WORDPRESS");
        const isConnected = wp?.connected || Boolean(business?.wordpressConnectedAt);
        const telemetry = business?.wordpressTelemetry as any;
        return {
          connected: isConnected,
          siteUrl: business?.wordpressUrl || business?.website || bSite,
          siteName: business?.wordpressSiteName || bName,
          pluginVersion: business?.wordpressPluginVersion || null,
          avgSeo: telemetry?.telemetry?.summary?.average_seo ?? null,
          avgAeo: telemetry?.telemetry?.summary?.average_aeo ?? null,
          avgGeo: telemetry?.telemetry?.summary?.average_geo ?? null,
          postsIndexed: telemetry?.telemetry?.summary?.count ?? 0,
          lastFixApplied: business?.wordpressLastFixApplied || null,
        };
      }

      case WidgetType.META_PAGE_REACH:
        return integrationsMap.get("FACEBOOK_PAGE")?.metricsCache || null;

      case WidgetType.INSTAGRAM_AUDIENCE:
        return integrationsMap.get("INSTAGRAM_INSIGHTS")?.metricsCache || null;

      case WidgetType.LINKEDIN_PAGE_STATS:
        return integrationsMap.get("LINKEDIN_COMPANY")?.metricsCache || null;

      default:
        return { active: true, businessName: bName, siteUrl: bSite };
    }
  }
}
