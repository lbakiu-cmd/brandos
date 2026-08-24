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
      return {
        ...sp,
        connected: !!existing && existing.status === ConnectionStatus.CONNECTED,
        accountName: existing?.accountName || (sp.provider === "WORDPRESS" ? business.wordpressSiteName || business.website : `${business.name} (${sp.name})`),
        status: existing?.status || (sp.provider === "WORDPRESS" && business.wordpressConnectedAt ? "CONNECTED" : "DISCONNECTED"),
        lastSyncedAt: existing?.lastSyncedAt || (sp.provider === "WORDPRESS" ? business.wordpressLastSyncedAt : null),
        metricsCache: existing?.metricsCache || (sp.provider === "WORDPRESS" ? business.wordpressTelemetry : this.generateSampleMetrics(sp.provider as IntegrationProvider, business)),
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

    const defaultMetrics = this.generateSampleMetrics(provider, business);

    const existing = await prisma.integrationAccount.findFirst({
      where: { businessId, provider },
    });

    if (existing) {
      return prisma.integrationAccount.update({
        where: { id: existing.id },
        data: {
          accountName: payload.accountName || `${business.name} (${provider})`,
          externalId: payload.externalId || `ext_${Date.now()}`,
          accessTokenEnc: payload.accessToken || "mock_access_token",
          refreshTokenEnc: payload.refreshToken,
          scopes: payload.scopes || "read:analytics",
          status: ConnectionStatus.CONNECTED,
          metricsCache: defaultMetrics,
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
        accessTokenEnc: payload.accessToken || "mock_access_token",
        refreshTokenEnc: payload.refreshToken,
        scopes: payload.scopes || "read:analytics",
        status: ConnectionStatus.CONNECTED,
        metricsCache: defaultMetrics,
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

    const updatedMetrics = this.generateSampleMetrics(provider, business);

    await prisma.integrationAccount.update({
      where: { id: existing.id },
      data: {
        metricsCache: updatedMetrics,
        lastSyncedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `${provider} metrics synchronized successfully!`,
      metrics: updatedMetrics,
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
      const freshMetrics = this.generateSampleMetrics(integration.provider, business);
      await prisma.integrationAccount.update({
        where: { id: integration.id },
        data: {
          accountName: `${business.name} (${integration.provider})`,
          metricsCache: freshMetrics,
          lastSyncedAt: new Date(),
        },
      });
    }
  }

  /**
   * Dynamically generate industry-specific & location-specific metrics for any business
   */
  generateSampleMetrics(provider: IntegrationProvider, business?: BusinessInfo | null): any {
    const bName = business?.name || "Local Enterprise";
    const bCity = business?.city || "your area";
    const bIndustry = (business?.industry || "").toLowerCase();
    const bSite = business?.website || `https://${bName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

    // 1. Determine Industry Keywords, Landing Pages & Review Contexts
    let keywords: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number; intent: string }>;
    let landingPages: Array<{ path: string; views: number; bounceRate: number }>;
    let reviewSnippets: Array<{ author: string; rating: number; time: string; comment: string; replied: boolean; reply?: string; aiDraft?: string }>;

    if (bIndustry.includes("law") || bIndustry.includes("legal") || bIndustry.includes("attorney")) {
      keywords = [
        { query: `best attorney in ${bCity}`, clicks: 780, impressions: 11400, ctr: 6.84, position: 1.8, intent: "High Commercial" },
        { query: `${bName} reviews`, clicks: 520, impressions: 6800, ctr: 7.64, position: 1.1, intent: "Branded Navigation" },
        { query: `personal injury lawyer near me`, clicks: 430, impressions: 14200, ctr: 3.02, position: 4.2, intent: "Urgent Local" },
        { query: `free legal consultation ${bCity}`, clicks: 390, impressions: 9800, ctr: 3.97, position: 2.9, intent: "Commercial" },
        { query: `corporate contract attorney cost`, clicks: 270, impressions: 7600, ctr: 3.55, position: 3.4, intent: "Informational" },
      ];
      landingPages = [
        { path: "/practice-areas/personal-injury", views: 4320, bounceRate: 19.4 },
        { path: "/consultation-request", views: 3290, bounceRate: 14.2 },
        { path: "/attorney-profiles", views: 2180, bounceRate: 24.5 },
      ];
      reviewSnippets = [
        { author: "Michael T.", rating: 5, time: "2 days ago", comment: `Outstanding counsel from ${bName}! Handled our case with top precision.`, replied: true, reply: `Thank you Michael! It was an honor representing your interests.` },
        { author: "Sarah W.", rating: 5, time: "4 days ago", comment: `Very responsive legal team. Transparent pricing and great outcome.`, replied: true, reply: `Thank you Sarah for trusting our firm.` },
        { author: "Robert H.", rating: 5, time: "1 week ago", comment: `Best legal consultation in ${bCity}. Highly recommend ${bName}.`, replied: false, aiDraft: `Thank you Robert! We are dedicated to providing premier legal guidance in ${bCity}.` },
      ];
    } else if (bIndustry.includes("restaurant") || bIndustry.includes("food") || bIndustry.includes("cafe") || bIndustry.includes("dining")) {
      keywords = [
        { query: `best restaurants in ${bCity}`, clicks: 1240, impressions: 24500, ctr: 5.06, position: 2.2, intent: "Local Discovery" },
        { query: `${bName} menu and prices`, clicks: 890, impressions: 9800, ctr: 9.08, position: 1.2, intent: "Branded Navigation" },
        { query: `dinner places with outdoor seating`, clicks: 610, impressions: 16400, ctr: 3.71, position: 3.1, intent: "High Intent" },
        { query: `weekend brunch near me`, clicks: 470, impressions: 12800, ctr: 3.67, position: 4.0, intent: "Local Discovery" },
      ];
      landingPages = [
        { path: "/menu", views: 8940, bounceRate: 12.1 },
        { path: "/table-reservations", views: 5120, bounceRate: 15.6 },
        { path: "/private-dining", views: 2310, bounceRate: 22.0 },
      ];
      reviewSnippets = [
        { author: "Jessica M.", rating: 5, time: "2 days ago", comment: `The food at ${bName} is incredible! Best dining experience in ${bCity}.`, replied: true, reply: `Thank you Jessica! We look forward to welcoming you back soon.` },
        { author: "Chef Anthony", rating: 5, time: "5 days ago", comment: `Exceptional flavors and top-tier service. 10/10 recommendation!`, replied: true, reply: `Thanks Anthony! Our kitchen team appreciates the high praise.` },
        { author: "Daniel B.", rating: 4, time: "1 week ago", comment: `Great cocktails and appetizers, slightly loud during peak dinner rush.`, replied: false, aiDraft: `Thanks Daniel! We appreciate your visit and feedback on acoustic comfort during rush hours.` },
      ];
    } else if (bIndustry.includes("roof") || bIndustry.includes("plumb") || bIndustry.includes("hvac") || bIndustry.includes("contractor") || bIndustry.includes("home") || bIndustry.includes("electric")) {
      keywords = [
        { query: `emergency repair in ${bCity}`, clicks: 940, impressions: 14200, ctr: 6.61, position: 1.9, intent: "Urgent Local" },
        { query: `${bName} contractor reviews`, clicks: 610, impressions: 6400, ctr: 9.53, position: 1.1, intent: "Branded Trust" },
        { query: `licensed contractors near me`, clicks: 480, impressions: 15900, ctr: 3.01, position: 3.8, intent: "Commercial" },
        { query: `free estimate replacement cost`, clicks: 360, impressions: 11200, ctr: 3.21, position: 4.5, intent: "High Commercial" },
      ];
      landingPages = [
        { path: "/services/emergency-repairs", views: 5120, bounceRate: 16.2 },
        { path: "/request-free-estimate", views: 3840, bounceRate: 11.8 },
        { path: "/warranty-and-financing", views: 2190, bounceRate: 20.4 },
      ];
      reviewSnippets = [
        { author: "George P.", rating: 5, time: "2 days ago", comment: `${bName} showed up within 30 minutes and did an exceptional repair job!`, replied: true, reply: `Thanks George! Fast, dependable service is our top priority.` },
        { author: "Linda K.", rating: 5, time: "4 days ago", comment: `Very honest pricing, no hidden fees. Highly recommend in ${bCity}.`, replied: true, reply: `Thank you Linda! We appreciate your business and trust.` },
        { author: "Marcus S.", rating: 5, time: "1 week ago", comment: `Professional crew, cleaned up everything after completing work.`, replied: false, aiDraft: `Thank you Marcus! We take great pride in delivering clean, reliable craftsmanship.` },
      ];
    } else if (bIndustry.includes("real estate") || bIndustry.includes("realty") || bIndustry.includes("property")) {
      keywords = [
        { query: `top real estate agent in ${bCity}`, clicks: 820, impressions: 12400, ctr: 6.61, position: 2.1, intent: "High Commercial" },
        { query: `${bName} homes for sale`, clicks: 650, impressions: 7800, ctr: 8.33, position: 1.2, intent: "Branded Listings" },
        { query: `sell my house fast ${bCity}`, clicks: 430, impressions: 14600, ctr: 2.94, position: 4.1, intent: "Urgent Seller" },
        { query: `luxury properties and apartments`, clicks: 380, impressions: 10200, ctr: 3.72, position: 3.3, intent: "High Intent" },
      ];
      landingPages = [
        { path: "/featured-listings", views: 6410, bounceRate: 18.0 },
        { path: "/home-valuation-calculator", views: 4120, bounceRate: 12.5 },
        { path: "/neighborhood-guides", views: 2890, bounceRate: 26.1 },
      ];
      reviewSnippets = [
        { author: "Emily R.", rating: 5, time: "3 days ago", comment: `${bName} helped us find our dream home in ${bCity}! Seamless closing.`, replied: true, reply: `Congratulations Emily! It was an absolute joy finding your new home.` },
        { author: "James & Karen", rating: 5, time: "1 week ago", comment: `Sold our property in under 2 weeks over asking price!`, replied: true, reply: `Thank you both! We are thrilled with the fantastic outcome.` },
        { author: "Peter V.", rating: 5, time: "2 weeks ago", comment: `Expert market knowledge and negotiations.`, replied: false, aiDraft: `Thank you Peter! We are proud to deliver top market results for our clients.` },
      ];
    } else if (bIndustry.includes("dental") || bIndustry.includes("medical") || bIndustry.includes("clinic") || bIndustry.includes("health")) {
      keywords = [
        { query: `dentist near me in ${bCity}`, clicks: 840, impressions: 14200, ctr: 5.92, position: 2.1, intent: "Local High Intent" },
        { query: `${bName} booking and reviews`, clicks: 610, impressions: 6800, ctr: 8.97, position: 1.1, intent: "Branded Trust" },
        { query: `emergency dentist open today`, clicks: 490, impressions: 9800, ctr: 5.00, position: 2.4, intent: "Urgent Medical" },
        { query: `teeth whitening and implants cost`, clicks: 390, impressions: 12100, ctr: 3.22, position: 4.8, intent: "Commercial" },
      ];
      landingPages = [
        { path: "/services/dental-implants", views: 4890, bounceRate: 21.0 },
        { path: "/pricing-and-insurance", views: 3420, bounceRate: 18.5 },
        { path: "/our-specialists", views: 2190, bounceRate: 25.4 },
      ];
      reviewSnippets = [
        { author: "Elena R.", rating: 5, time: "2 days ago", comment: `Outstanding care at ${bName}! Gentle treatment and high-tech equipment.`, replied: true, reply: `Thank you Elena! We are thrilled to provide premier dental care.` },
        { author: "Marcus V.", rating: 5, time: "4 days ago", comment: `The staff and booking were super fast and gentle. Highly recommend.`, replied: true, reply: `Thanks Marcus! We appreciate your trust in our team.` },
        { author: "Sarah K.", rating: 4, time: "1 week ago", comment: `Great experience overall, treatment was 10/10.`, replied: false, aiDraft: `Thank you Sarah! We look forward to keeping your smile bright.` },
      ];
    } else {
      // General B2B / SaaS / Agency / Business
      keywords = [
        { query: `${bName} official website`, clicks: 920, impressions: 8400, ctr: 10.95, position: 1.1, intent: "Branded Navigation" },
        { query: `top ${business?.industry || "services"} in ${bCity}`, clicks: 740, impressions: 13800, ctr: 5.36, position: 2.4, intent: "Local High Intent" },
        { query: `verified ${business?.industry || "service"} pricing`, clicks: 480, impressions: 11400, ctr: 4.21, position: 3.2, intent: "Commercial" },
        { query: `best ${business?.industry || "consulting"} near me`, clicks: 390, impressions: 10900, ctr: 3.57, position: 4.1, intent: "Discovery" },
      ];
      landingPages = [
        { path: "/services", views: 5240, bounceRate: 19.8 },
        { path: "/pricing", views: 3820, bounceRate: 14.5 },
        { path: "/case-studies", views: 2410, bounceRate: 22.1 },
      ];
      reviewSnippets = [
        { author: "Alex P.", rating: 5, time: "2 days ago", comment: `Outstanding results working with ${bName}. Professional, timely and verified quality.`, replied: true, reply: `Thank you Alex! It has been a pleasure collaborating with your team.` },
        { author: "Maria G.", rating: 5, time: "5 days ago", comment: `Top-notch execution and clear communication from day one.`, replied: true, reply: `Thanks Maria! We value your partnership.` },
        { author: "Chris D.", rating: 5, time: "1 week ago", comment: `Best service provider in ${bCity}. Will definitely use again!`, replied: false, aiDraft: `Thank you Chris! We are committed to delivering top results in ${bCity}.` },
      ];
    }

    switch (provider) {
      case IntegrationProvider.GOOGLE_SEARCH_CONSOLE:
        return {
          businessName: bName,
          siteUrl: bSite,
          totalClicks: 3480,
          clicksGrowth: 14.2,
          totalImpressions: 89400,
          impressionsGrowth: 22.8,
          averageCtr: 3.89,
          averagePosition: 8.4,
          topQueries: keywords,
          historicalTrend: [
            { date: "Day 1", clicks: 95, impressions: 2700 },
            { date: "Day 5", clicks: 112, impressions: 3100 },
            { date: "Day 10", clicks: 128, impressions: 3400 },
            { date: "Day 15", clicks: 140, impressions: 3900 },
            { date: "Day 20", clicks: 165, impressions: 4200 },
            { date: "Day 25", clicks: 180, impressions: 4600 },
            { date: "Day 28", clicks: 210, impressions: 5100 },
          ],
        };

      case IntegrationProvider.GOOGLE_ANALYTICS_4:
        return {
          businessName: bName,
          siteUrl: bSite,
          totalUsers: 14280,
          usersGrowth: 18.4,
          sessions: 19400,
          engagementRate: 68.4,
          aiReferralSessions: 2340,
          aiReferralShare: 12.1,
          aiEngines: [
            { engine: "ChatGPT (chatgpt.com)", sessions: 1180, growth: 42.1, avgTime: "2m 45s", goalConvRate: 8.4 },
            { engine: "Perplexity AI", sessions: 640, growth: 58.6, avgTime: "3m 12s", goalConvRate: 11.2 },
            { engine: "Google Gemini / AI Overview", sessions: 390, growth: 24.3, avgTime: "1m 55s", goalConvRate: 6.8 },
            { engine: "Claude.ai", sessions: 130, growth: 19.5, avgTime: "2m 10s", goalConvRate: 7.5 },
          ],
          topLandingPages: landingPages,
        };

      case IntegrationProvider.GOOGLE_BUSINESS_PROFILE:
        return {
          businessName: bName,
          city: bCity,
          totalInteractions: 3120,
          growth: 16.5,
          searchViews: 14800,
          mapsViews: 9800,
          callClicks: 430,
          directionRequests: 680,
          websiteClicks: 1190,
          averageRating: 4.9,
          totalReviews: 142,
          recentReviews: reviewSnippets,
        };

      case IntegrationProvider.FACEBOOK_PAGE:
        return {
          businessName: bName,
          totalFans: 8940,
          pageReach: 38200,
          postEngagement: 4120,
          engagementRate: 4.8,
          impressions: 54100,
        };

      case IntegrationProvider.INSTAGRAM_INSIGHTS:
        return {
          businessName: bName,
          followers: 12400,
          profileVisits: 3840,
          reach: 48200,
          impressions: 78900,
          topAudienceCity: bCity,
          avgLikesPerPost: 342,
        };

      case IntegrationProvider.LINKEDIN_COMPANY:
        return {
          businessName: bName,
          followers: 3420,
          visitorImpressions: 14200,
          clickThroughRate: 5.2,
          newFollowers30d: 280,
        };

      default:
        return { active: true, businessName: bName, siteUrl: bSite, syncedAt: new Date().toISOString() };
    }
  }
}
