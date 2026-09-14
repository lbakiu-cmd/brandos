import { Injectable, Logger } from "@nestjs/common";
import { prisma, IntegrationProvider } from "@brandos/database";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export interface GscSiteItem {
  siteUrl: string;
  domain: string;
  permissionLevel: string;
  isSelected?: boolean;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  private getCredentials(customRedirectUri?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const redirectUri =
      customRedirectUri ||
      process.env.GOOGLE_AUTH_REDIRECT_URI ||
      process.env.GOOGLE_REDIRECT_URI ||
      "https://icandothat.online/api/oauth/google/callback";

    return { clientId, clientSecret, redirectUri };
  }

  /**
   * Generate Google OAuth 2.0 Consent URL
   */
  generateAuthUrl(
    businessId: string,
    returnUrl?: string,
    customRedirectUri?: string,
    origin?: string
  ): string {
    const { clientId, redirectUri } = this.getCredentials(customRedirectUri);

    if (!clientId) {
      this.logger.warn("GOOGLE_CLIENT_ID is not configured in environment.");
    }

    // Identity scopes (openid/email/profile) are intentionally omitted here: this flow
    // requires an authenticated session already (AuthGuard), and the callback never
    // reads identity info from the token response — only data-access scopes are needed.
    const scopes = [
      "https://www.googleapis.com/auth/webmasters.readonly", // Google Search Console
      "https://www.googleapis.com/auth/analytics.readonly",   // Google Analytics 4
      "https://www.googleapis.com/auth/business.manage",      // Google Business Profile
    ].join(" ");

    const stateObj = {
      bId: businessId,
      ret: returnUrl || "/dashboard/integrations",
      origin: origin || "https://icandothat.online",
      t: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCode(code: string, customRedirectUri?: string): Promise<GoogleTokens> {
    const { clientId, clientSecret, redirectUri } = this.getCredentials(customRedirectUri);

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Google token exchange failed: ${errText}`);
      throw new Error(`Google token exchange failed: ${res.statusText}`);
    }

    return (await res.json()) as GoogleTokens;
  }

  /**
   * Automatically refresh and return a valid access token
   */
  async getFreshAccessToken(businessId: string, provider: IntegrationProvider = IntegrationProvider.GOOGLE_SEARCH_CONSOLE): Promise<string | null> {
    const account = await prisma.integrationAccount.findFirst({
      where: { businessId, provider },
    });

    if (!account || !account.accessTokenEnc) {
      return null;
    }

    // Check if token is expired (with 2 min buffer)
    const isExpired = account.tokenExpiresAt
      ? account.tokenExpiresAt.getTime() - Date.now() < 120000
      : true;

    if (!isExpired && account.accessTokenEnc) {
      return account.accessTokenEnc;
    }

    if (!account.refreshTokenEnc) {
      return account.accessTokenEnc;
    }

    // Refresh token
    const { clientId, clientSecret } = this.getCredentials();
    if (!clientId || !clientSecret) return account.accessTokenEnc;

    try {
      const refreshParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: account.refreshTokenEnc,
        grant_type: "refresh_token",
      });

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: refreshParams.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);

        // Update all Google integration rows
        await prisma.integrationAccount.updateMany({
          where: {
            businessId,
            provider: {
              in: [
                IntegrationProvider.GOOGLE_SEARCH_CONSOLE,
                IntegrationProvider.GOOGLE_ANALYTICS_4,
                IntegrationProvider.GOOGLE_BUSINESS_PROFILE,
              ],
            },
          },
          data: {
            accessTokenEnc: data.access_token,
            tokenExpiresAt: newExpiry,
            lastSyncedAt: new Date(),
          },
        });

        this.logger.log(`Google access token refreshed for business ${businessId}`);
        return data.access_token;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to refresh Google access token: ${err.message}`);
    }

    return account.accessTokenEnc;
  }

  /**
   * Get all verified sites from Google Search Console for domain selection
   */
  async getSitesList(businessId: string): Promise<GscSiteItem[]> {
    const token = await this.getFreshAccessToken(businessId);
    if (!token) return [];

    try {
      const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return [];
      const data = await res.json();
      const rawSites = data.siteEntry || [];

      const business = await prisma.business.findUnique({ where: { id: businessId } });
      const currentSite = business?.website || "";

      return rawSites.map((s: any) => {
        let domain = s.siteUrl
          .replace("sc-domain:", "")
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "");

        const isSelected =
          currentSite.includes(domain) || domain.includes(currentSite.replace(/^https?:\/\//, ""));

        return {
          siteUrl: s.siteUrl,
          domain,
          permissionLevel: s.permissionLevel,
          isSelected,
        };
      });
    } catch (err: any) {
      this.logger.warn(`Failed to fetch GSC sites list: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch live Search Console queries and metrics for any selected site
   */
  async fetchGscMetrics(accessToken: string, targetSite: string, days = 28) {
    // Search Console's search-analytics history only retains ~16 months
    const rangeDays = Math.min(days && days > 0 ? days : 480, 480);
    try {
      let siteToQuery = targetSite;

      // Check sites available if targetSite isn't an exact match
      if (!siteToQuery.startsWith("sc-domain:") && !siteToQuery.startsWith("http")) {
        const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (sitesRes.ok) {
          const sitesData = await sitesRes.json();
          const entries = sitesData.siteEntry || [];
          const cleanTarget = targetSite.replace(/^https?:\/\//, "").replace(/\/$/, "");
          const matched = entries.find(
            (s: any) => s.siteUrl.includes(cleanTarget) || cleanTarget.includes(s.siteUrl)
          );
          if (matched) siteToQuery = matched.siteUrl;
          else if (entries.length > 0) siteToQuery = entries[0].siteUrl;
        }
      }

      // Query search analytics
      const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const endDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const queryRes = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
          siteToQuery
        )}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ["query"],
            rowLimit: 25,
          }),
        }
      );

      if (queryRes.ok) {
        const queryData = await queryRes.json();
        const rows = queryData.rows || [];
        let totalClicks = 0;
        let totalImpressions = 0;
        let totalPositionSum = 0;

        const topQueries = rows.map((r: any) => {
          totalClicks += r.clicks || 0;
          totalImpressions += r.impressions || 0;
          totalPositionSum += r.position || 0;
          return {
            query: r.keys?.[0] || "search query",
            clicks: r.clicks || 0,
            impressions: r.impressions || 0,
            ctr: r.ctr ? parseFloat((r.ctr * 100).toFixed(2)) : 0,
            position: r.position ? parseFloat(r.position.toFixed(1)) : 1.0,
            intent: "Organic Search",
          };
        });

        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const avgPosition = rows.length > 0 ? totalPositionSum / rows.length : 1.0;

        const cleanDomain = siteToQuery
          .replace("sc-domain:", "")
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "");

        return {
          siteUrl: siteToQuery,
          domain: cleanDomain,
          totalClicks,
          totalImpressions,
          averageCtr: parseFloat(avgCtr.toFixed(2)),
          averagePosition: parseFloat(avgPosition.toFixed(1)),
          topQueries: topQueries.length > 0 ? topQueries : [],
          isLiveOAuth: true,
          lastFetchedAt: new Date().toISOString(),
        };
      } else {
        const cleanDomain = siteToQuery
          .replace("sc-domain:", "")
          .replace(/^https?:\/\//, "")
          .replace(/\/$/, "");
        return {
          siteUrl: siteToQuery,
          domain: cleanDomain,
          totalClicks: 0,
          totalImpressions: 0,
          averageCtr: 0,
          averagePosition: 0,
          topQueries: [],
          isLiveOAuth: true,
          notice: "No search queries recorded yet for this domain in Google Search Console.",
          lastFetchedAt: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      this.logger.warn(`Failed to query live Google Search Console: ${err.message}`);
    }
    return null;
  }

  /**
   * Fetch live GA4 sessions and AI referrals filtered by business domain / name
   */
  async fetchGa4Metrics(accessToken: string, targetDomain?: string, targetBusinessName?: string, days = 28, explicitPropertyId?: string) {
    if (!Number.isInteger(days) || days < 0 || days > 365) return null;
    try {
      let matchedProperty: string | null = null;

      if (explicitPropertyId) {
        // User explicitly picked a property from the list -- skip auto-matching entirely.
        matchedProperty = explicitPropertyId.startsWith("properties/") ? explicitPropertyId : `properties/${explicitPropertyId}`;
      } else {
        const accountRes = await fetch(
          "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!accountRes.ok) {
          this.logger.warn(`GA4 accountSummaries request failed: HTTP ${accountRes.status} ${await accountRes.text().catch(() => "")}`);
          return null;
        }
        const accountData = await accountRes.json();
        const accounts = accountData.accountSummaries || [];

        // Find matching property based on declared domain or business name
        const cleanDomain = (targetDomain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
        const cleanName = (targetBusinessName || "").toLowerCase().trim();

        for (const acc of accounts) {
          const properties = acc.propertySummaries || [];
          for (const p of properties) {
            const propName = (p.displayName || "").toLowerCase();
            if (
              (cleanDomain && propName.includes(cleanDomain)) ||
              (cleanName && propName.includes(cleanName))
            ) {
              matchedProperty = p.property;
              break;
            }
          }
          if (matchedProperty) break;
        }

        // Fallback to first property if no exact domain match found
        if (!matchedProperty && !cleanDomain && !cleanName && accounts.length === 1 && accounts[0]?.propertySummaries?.length === 1) {
          matchedProperty = accounts[0].propertySummaries[0].property;
        }

        if (!matchedProperty) {
          const allPropertyNames = accounts.flatMap((a: any) => (a.propertySummaries || []).map((p: any) => p.displayName));
          this.logger.warn(
            `No GA4 property matched domain="${cleanDomain}" name="${cleanName}". Available properties on this Google account: ${allPropertyNames.length ? allPropertyNames.join(", ") : "(none -- account has no GA4 properties visible to this token)"}`
          );
          return null;
        }
      }

      const propertyId = matchedProperty.replace("properties/", "");
      const dateRange = { startDate: days === 0 ? "2015-08-14" : `${days}daysAgo`, endDate: "yesterday" };
      const reportUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
      const query = async (dimensions: string[], metrics: string[], offset = 0) => {
        const res = await fetch(reportUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRanges: [dateRange],
            dimensions: dimensions.map(name => ({ name })),
            metrics: metrics.map(name => ({ name })),
            limit: 10000,
            offset,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`GA4 report failed: HTTP ${res.status}`);
        return res.json();
      };

      // Query users without source dimensions to avoid counting the same user twice.
      const totals = await query([], ["activeUsers", "sessions"]);
      const totalUsers = Number(totals.rows?.[0]?.metricValues?.[0]?.value ?? 0);
      const totalSessions = Number(totals.rows?.[0]?.metricValues?.[1]?.value ?? 0);
      const aiEngines: Array<{ engine: string; sessions: number }> = [];
      const socialChannels: Array<{ channel: string; sessions: number }> = [];
      let offset = 0;
      let rowCount = 0;
      do {
        const report = await query(["sessionSource"], ["sessions"], offset);
        const rows = report.rows || [];
        rowCount = Number(report.rowCount || 0);
        if (!rows.length && offset < rowCount) throw new Error("GA4 returned an incomplete report");
        for (const row of rows) {
          const source = row.dimensionValues?.[0]?.value?.toLowerCase() || "";
          const sessions = Number(row.metricValues?.[0]?.value ?? 0);
          if (/(chatgpt|openai|perplexity|claude|gemini)/.test(source)) {
            aiEngines.push({ engine: source, sessions });
          } else if (/(instagram|facebook|tiktok|linkedin|youtube|twitter|t\\.co|x\\.com|pinterest|threads)/.test(source)) {
            socialChannels.push({ channel: source, sessions });
          }
        }
        offset += rows.length;
      } while (offset < rowCount);
      const aiSessions = aiEngines.reduce((sum, row) => sum + row.sessions, 0);
      const socialSessions = socialChannels.reduce((sum, row) => sum + row.sessions, 0);
      return {
        propertyId,
        totalUsers,
        totalSessions,
        aiReferralSessions: aiSessions,
        aiReferralShare: totalSessions ? Number((100 * aiSessions / totalSessions).toFixed(1)) : 0,
        socialReferralSessions: socialSessions,
        socialReferralShare: totalSessions ? Number((100 * socialSessions / totalSessions).toFixed(1)) : 0,
        aiEngines,
        socialChannels,
        socialSources: socialChannels,
        measurementVersion: 2,
        days,
        dateRange,
        lastFetchedAt: new Date().toISOString(),
        isLiveOAuth: true,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to query live GA4 Data API: ${err.message}`);
    }
    return null;
  }

  /**
   * List every GA4 property visible to this token, across every account --
   * used to let a user pick the right one when auto-matching can't be trusted
   * (e.g. an agency's single Google account holding many clients' properties).
   */
  async getGa4PropertiesList(accessToken: string): Promise<Array<{ property: string; displayName: string; accountName: string }>> {
    try {
      const res = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const accounts = data.accountSummaries || [];
      const list: Array<{ property: string; displayName: string; accountName: string }> = [];
      for (const acc of accounts) {
        for (const p of acc.propertySummaries || []) {
          list.push({
            property: p.property,
            displayName: p.displayName || p.property,
            accountName: acc.displayName || "",
          });
        }
      }
      return list;
    } catch (err: any) {
      this.logger.warn(`Failed to list GA4 properties: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch live Google Business Profile reviews and performance filtered by business name / domain
   */
  async fetchGbpMetrics(
    accessToken: string,
    targetBusinessName?: string,
    targetDomain?: string,
    targetCity?: string,
    days = 28,
    businessId?: string,
    explicitLocationName?: string
  ) {
    let averageRating: number | null = null;
    let totalReviews: number | null = null;
    if (businessId) {
      const reviews = await prisma.googleReview.findMany({ where: { businessId }, select: { rating: true } });
      if (reviews.length > 0) {
        totalReviews = reviews.length;
        averageRating = Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1));
      }
    }
    try {
      let matchedLocation: any = null;

      if (explicitLocationName) {
        // User explicitly picked a location from the list -- skip auto-matching entirely.
        matchedLocation = { name: explicitLocationName, title: undefined };
      } else {
        const accountsRes = await fetch(
          "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!accountsRes.ok) {
          this.logger.warn(`GBP accounts request failed: HTTP ${accountsRes.status} ${await accountsRes.text().catch(() => "")}`);
          return null;
        }
        const accountsData = await accountsRes.json();
        const accounts = accountsData.accounts || [];
        if (accounts.length === 0) {
          this.logger.warn("GBP: this Google account has no Business Profile accounts visible to the granted token.");
          return null;
        }

        const cleanName = (targetBusinessName || "").toLowerCase().trim();
        const cleanDomain = (targetDomain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
        const cleanCity = (targetCity || "").toLowerCase().trim();

        const allLocationTitles: string[] = [];

        // Iterate through all accounts and locations to find matching business profile
        for (const acc of accounts) {
          const locRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (!locRes.ok) {
            this.logger.warn(`GBP locations request failed for account ${acc.name}: HTTP ${locRes.status}`);
          }

          if (locRes.ok) {
            const locData = await locRes.json();
            const locations = locData.locations || [];

            for (const loc of locations) {
              allLocationTitles.push(loc.title || loc.name);
              const title = (loc.title || "").toLowerCase();
              const web = (loc.websiteUri || "").toLowerCase();
              const city = (loc.storefrontAddress?.locality || "").toLowerCase();

              const nameMatch = cleanName && (title.includes(cleanName) || cleanName.includes(title));
              const domainMatch = cleanDomain && (web.includes(cleanDomain) || cleanDomain.includes(web));
              const cityMatch = cleanCity && city.includes(cleanCity);

              if (nameMatch || domainMatch || (cleanCity && cityMatch)) {
                matchedLocation = loc;
                break;
              }
            }
            if (matchedLocation) break;
            if (!matchedLocation && locations.length > 0) {
              matchedLocation = locations[0]; // fallback
              this.logger.warn(
                `GBP: no location matched name="${cleanName}" domain="${cleanDomain}" city="${cleanCity}" -- falling back to first listed location "${allLocationTitles[0]}". All locations seen: ${allLocationTitles.join(", ")}`
              );
            }
          }
        }
      }

      if (!matchedLocation) {
        this.logger.warn("GBP: no Business Profile locations found on any account visible to this token.");
      }

      if (matchedLocation) {
        // Performance API historical data is limited to roughly 18 months back
        const rangeDays = Math.min(days && days > 0 ? days : 540, 540);

        // Attempt to fetch performance metrics from Performance API for matched location
        try {
          const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
          const endDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const perfUrl = `https://businessprofileperformance.googleapis.com/v1/${matchedLocation.name}:fetchMultiDailyMetricsTimeSeries?dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS,BUSINESS_IMPRESSIONS_DESKTOP_SEARCH,BUSINESS_IMPRESSIONS_MOBILE_MAPS,BUSINESS_IMPRESSIONS_MOBILE_SEARCH,CALL_CLICKS,WEBSITE_CLICKS,BUSINESS_DIRECTION_REQUESTS&dailyRange.start_date.year=${startDate.getFullYear()}&dailyRange.start_date.month=${startDate.getMonth() + 1}&dailyRange.start_date.day=${startDate.getDate()}&dailyRange.end_date.year=${endDate.getFullYear()}&dailyRange.end_date.month=${endDate.getMonth() + 1}&dailyRange.end_date.day=${endDate.getDate()}`;

          const perfRes = await fetch(perfUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (perfRes.ok) {
            const perfData = await perfRes.json();
            const timeSeries = perfData.multiDailyMetricTimeSeries || [];
            let searchViews = 0;
            let mapsViews = 0;
            let callClicks = 0;
            let directionRequests = 0;
            let websiteClicks = 0;

            timeSeries.forEach((series: any) => {
              const metricType = series.dailyMetric;
              const values = series.dailyMetricTimeSeries?.timeSeries?.datedValues || [];
              const sum = values.reduce((acc: number, v: any) => acc + parseInt(v.value || "0", 10), 0);

              if (metricType.includes("SEARCH")) searchViews += sum;
              else if (metricType.includes("MAPS")) mapsViews += sum;
              else if (metricType === "CALL_CLICKS") callClicks += sum;
              else if (metricType === "BUSINESS_DIRECTION_REQUESTS") directionRequests += sum;
              else if (metricType === "WEBSITE_CLICKS") websiteClicks += sum;
            });

            return {
              accountName: matchedLocation.title || "Google Business Profile",
              locationName: matchedLocation.name,
              searchViews,
              mapsViews,
              callClicks,
              directionRequests,
              websiteClicks,
              totalInteractions: callClicks + directionRequests + websiteClicks,
              averageRating,
              totalReviews,
              days: rangeDays,
              isLiveOAuth: true,
              lastFetchedAt: new Date().toISOString(),
            };
          }
          this.logger.warn(`GBP Performance API request failed for location ${matchedLocation.name}: HTTP ${perfRes.status} ${await perfRes.text().catch(() => "")}`);
        } catch (perfErr: any) {
          this.logger.warn(`Performance API failed for location ${matchedLocation.name}: ${perfErr.message}`);
        }

        return {
          accountName: matchedLocation.title || "Google Business Profile",
          locationName: matchedLocation.name,
          searchViews: 0,
          mapsViews: 0,
          callClicks: 0,
          directionRequests: 0,
          websiteClicks: 0,
          totalInteractions: 0,
          averageRating,
          totalReviews,
          days: rangeDays,
          isLiveOAuth: true,
          notice: "No performance data available yet for this Google Business Profile listing.",
          lastFetchedAt: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      this.logger.warn(`Failed to query live Google Business Profile: ${err.message}`);
    }
    return null;
  }

  /**
   * List every Business Profile location visible to this token, across every
   * account -- used to let a user pick the right one instead of relying on
   * name/domain/city matching (e.g. an agency's account with many clients).
   */
  async getGbpLocationsList(accessToken: string): Promise<Array<{ name: string; title: string; accountName: string }>> {
    try {
      const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!accountsRes.ok) return [];
      const accountsData = await accountsRes.json();
      const accounts = accountsData.accounts || [];

      const list: Array<{ name: string; title: string; accountName: string }> = [];
      for (const acc of accounts) {
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!locRes.ok) continue;
        const locData = await locRes.json();
        for (const loc of locData.locations || []) {
          list.push({ name: loc.name, title: loc.title || loc.name, accountName: acc.accountName || acc.name });
        }
      }
      return list;
    } catch (err: any) {
      this.logger.warn(`Failed to list GBP locations: ${err.message}`);
      return [];
    }
  }
}
