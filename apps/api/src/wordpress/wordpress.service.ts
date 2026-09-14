import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@brandos/database";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class WordpressService {
  /**
   * Get or generate active WordPress connection details and API key for a business
   */
  async getConnection(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException("Business not found.");
    }

    // Auto-generate API key if not set
    let apiKey = business.wordpressApiKey;
    if (!apiKey) {
      apiKey = `bos_live_${crypto.randomBytes(16).toString("hex")}`;
      await prisma.business.update({
        where: { id: businessId },
        data: { wordpressApiKey: apiKey },
      });
    }

    return {
      connected: !!(business.wordpressUrl && business.wordpressConnectedAt),
      wordpressUrl: business.wordpressUrl,
      wordpressSiteName: business.wordpressSiteName,
      wordpressPluginVersion: business.wordpressPluginVersion || "1.6.0",
      wordpressConnectedAt: business.wordpressConnectedAt,
      wordpressLastSyncedAt: business.wordpressLastSyncedAt,
      wordpressTelemetry: business.wordpressTelemetry,
      apiKey,
    };
  }

  /**
   * Regenerate API key for a business
   */
  async rotateApiKey(businessId: string) {
    const newApiKey = `bos_live_${crypto.randomBytes(16).toString("hex")}`;
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        wordpressApiKey: newApiKey,
      },
    });

    return { apiKey: newApiKey };
  }

  /**
   * Handshake verification called by WordPress Plugin (POST /wordpress/verify)
   */
  async verifyFromPlugin(apiKey: string, payload: { site_url: string; site_name?: string; plugin_version?: string }) {
    if (!apiKey) {
      throw new BadRequestException("Missing API key.");
    }

    const cleanKey = apiKey.replace(/^Bearer\s+/i, "").trim();

    const business = await prisma.business.findFirst({
      where: { wordpressApiKey: cleanKey },
    });

    if (!business) {
      throw new BadRequestException("Invalid AIVisibility SEO API Key. Please verify in AIVisibility SEO settings.");
    }

    const cleanSiteUrl = payload.site_url ? payload.site_url.replace(/\/+$/, "") : "";

    await prisma.business.update({
      where: { id: business.id },
      data: {
        wordpressUrl: cleanSiteUrl,
        wordpressSiteName: payload.site_name || "WordPress Site",
        wordpressPluginVersion: payload.plugin_version || "1.6.1",
        wordpressConnectedAt: new Date(),
        wordpressLastSyncedAt: new Date(),
      },
    });

    return {
      success: true,
      business_id: business.id,
      business_name: business.name,
      message: `Successfully connected ${business.name} with AIVision SEO Plugin!`,
    };
  }

  /**
   * Connect initiated from AIVisibility SEO Dashboard
   */
  async connectFromDashboard(businessId: string, siteUrl: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException("Business not found.");

    let targetUrl = siteUrl.trim().replace(/\/+$/, "");
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    let apiKey = business.wordpressApiKey;
    if (!apiKey) {
      apiKey = `bos_live_${crypto.randomBytes(16).toString("hex")}`;
      await prisma.business.update({
        where: { id: businessId },
        data: { wordpressApiKey: apiKey },
      });
    }

    // Ping WordPress plugin handshake endpoint
    const endpoint = `${targetUrl}/wp-json/aivision-seo/v1/verify`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          api_key: apiKey,
          business_id: businessId,
          api_url: process.env.API_URL || "http://localhost:4000",
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`WordPress responded with status ${res.status}`);
      }

      const data = (await res.json()) as any;

      if (data?.success !== true) throw new Error("WordPress rejected the connection.");

      await prisma.business.update({
        where: { id: businessId },
        data: {
          wordpressUrl: targetUrl,
          wordpressSiteName: data.site_name || "WordPress Site",
          wordpressPluginVersion: data.plugin_version || "1.6.0",
          wordpressConnectedAt: new Date(),
          wordpressLastSyncedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Successfully connected to WordPress site!",
        site: data,
      };
    } catch (err: any) {
      throw new BadRequestException(`Could not verify WordPress: ${err?.message || "timeout"}. Save the dashboard API key in WordPress admin first.`);
    }
  }

  /**
   * Disconnect WordPress site
   */
  async disconnect(businessId: string) {
    await prisma.business.update({
      where: { id: businessId },
      data: {
        wordpressUrl: null,
        wordpressConnectedAt: null,
        wordpressLastSyncedAt: null,
        wordpressSiteName: null,
        wordpressTelemetry: null,
      },
    });

    return { success: true, message: "WordPress site disconnected." };
  }

  /**
   * Sync telemetry and post scoring from connected WordPress site
   */
  async sync(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.wordpressUrl) {
      throw new BadRequestException("WordPress is not connected for this business.");
    }

    const siteUrl = business.wordpressUrl.replace(/\/+$/, "");
    const apiKey = business.wordpressApiKey;

    try {
      const [statusRes, telemetryRes] = await Promise.all([
        fetch(`${siteUrl}/wp-json/aivision-seo/v1/status`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        }).catch(() => null),
        fetch(`${siteUrl}/wp-json/aivision-seo/v1/telemetry`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        }).catch(() => null),
      ]);

      const statusData = statusRes && statusRes.ok ? await statusRes.json() : null;
      const telemetryData = telemetryRes && telemetryRes.ok ? await telemetryRes.json() : null;

      if (statusData?.success !== true || telemetryData?.success !== true ||
          !telemetryData.summary ||
          !["average_seo", "average_aeo", "average_geo", "count"].every(
            key => typeof telemetryData.summary[key] === "number" &&
              Number.isFinite(telemetryData.summary[key]) && telemetryData.summary[key] >= 0
          )) {
        throw new Error("WordPress status or telemetry failed or returned an invalid response. Update the plugin and retry.");
      }

      const existingTelemetry = (business.wordpressTelemetry as any) || {};
      const combinedTelemetry = {
        ...existingTelemetry,
        status: statusData,
        telemetry: telemetryData,
        syncedAt: new Date().toISOString(),
      };

      const pluginVersion = statusData?.plugin_version || business.wordpressPluginVersion || "1.6.0";

      await prisma.business.update({
        where: { id: businessId },
        data: {
          wordpressLastSyncedAt: new Date(),
          wordpressPluginVersion: pluginVersion,
          wordpressSiteName: statusData?.site_name || business.wordpressSiteName,
          wordpressTelemetry: combinedTelemetry as any,
        },
      });

      // Update DashboardWidget cache if present
      if (telemetryData?.summary) {
        const avgSeo = Number(telemetryData.summary.average_seo || 0);
        const avgAeo = Number(telemetryData.summary.average_aeo || 0);
        const avgGeo = Number(telemetryData.summary.average_geo || 0);
        const count = Number(telemetryData.summary.count || 0);

        await prisma.dashboardWidget.updateMany({
          where: { businessId, widgetType: "WORDPRESS_AIVISION_STATUS" },
          data: {
            config: {
              connected: true,
              siteUrl: business.wordpressUrl,
              pluginVersion,
              avgSeo,
              avgAeo,
              avgGeo,
              postsIndexed: count,
              lastSyncedAt: new Date().toISOString(),
            },
          },
        }).catch(() => {});

        // Record MetricSnapshot
        const now = new Date();
        await prisma.metricSnapshot.createMany({
          data: [
            { businessId, provider: "WORDPRESS", metricKey: "seo_score", value: avgSeo, date: now },
            { businessId, provider: "WORDPRESS", metricKey: "aeo_score", value: avgAeo, date: now },
            { businessId, provider: "WORDPRESS", metricKey: "geo_score", value: avgGeo, date: now },
          ],
        }).catch(() => {});
      }

      return {
        success: true,
        message: "Successfully synchronized with WordPress site!",
        data: combinedTelemetry,
      };
    } catch (err: any) {
      throw new BadRequestException(`Failed to sync with WordPress: ${err?.message || "Unknown error"}`);
    }
  }

  async syncFromPlugin(authHeader: string) {
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!apiKey) throw new BadRequestException("Missing API key.");
    const business = await prisma.business.findFirst({ where: { wordpressApiKey: apiKey } });
    if (!business) throw new BadRequestException("Invalid API key.");
    return this.sync(business.id);
  }

  /**
   * 1-Click Remote Fix Dispatcher: Send fix to connected WordPress site
   */
  async applyRemoteFix(
    businessId: string,
    fixPayload: {
      fix_type: "ROBOTS_TXT" | "LLMS_TXT_BIO" | "ADD_SCHEMA" | "FAQ_SCHEMA" | "LOCAL_BUSINESS_SCHEMA" | "GENERATE_FEEDS" | string;
      payload?: any;
    }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.wordpressUrl) {
      throw new BadRequestException("WordPress site is not connected for this business. Please connect AIVision SEO plugin first.");
    }

    const siteUrl = business.wordpressUrl.replace(/\/+$/, "");
    const apiKey = business.wordpressApiKey;

    const endpoint = `${siteUrl}/wp-json/aivision-seo/v1/apply-fix`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(fixPayload),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || `WordPress HTTP status ${res.status}`);
      }

      const result = await res.json();
      return {
        success: true,
        message: result.message || "Fix successfully applied to WordPress site!",
        result,
      };
    } catch (err: any) {
      throw new BadRequestException(`Failed to apply fix in WordPress: ${err?.message || "Remote connection failed"}`);
    }
  }

  /**
   * Automated 1-Click Platform Auto-Remediation:
   * Finds all pending/open recommendations on the platform that have WordPress fix counterparts
   * and dispatches them automatically to WordPress, updating their status to DONE.
   */
  async autoRemediate(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.wordpressUrl) {
      throw new BadRequestException("WordPress is not connected for this business. Please connect AIVision SEO plugin first.");
    }

    const openRecs = await prisma.recommendation.findMany({
      where: { businessId, status: "OPEN" },
    });

    const fixedRecIds: string[] = [];
    const appliedFixes: string[] = [];
    const errors: string[] = [];

    // 1. Robots.txt check
    const hasRobotsIssue = openRecs.some(
      (r) =>
        r.actionType === "ROBOTS_TXT" ||
        r.title.toLowerCase().includes("robot") ||
        r.title.toLowerCase().includes("crawler") ||
        (r.actionPayload as any)?.filename?.toLowerCase().includes("robot")
    );

    if (hasRobotsIssue) {
      try {
        await this.applyRemoteFix(businessId, {
          fix_type: "OPTIMIZE_ROBOTS",
          payload: {
            allowed_bots: [
              "Googlebot", "Bingbot", "DuckDuckBot", "Applebot", "Googlebot-News",
              "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web",
              "anthropic-ai", "PerplexityBot", "Google-Extended", "Applebot-Extended",
              "Meta-ExternalAgent", "FacebookBot", "Bytespider", "Amazonbot", "cohere-ai",
              "Diffbot", "CCBot",
              "facebookexternalhit", "Twitterbot", "LinkedInBot", "Pinterestbot"
            ],
          },
        });
        appliedFixes.push("Optimized robots.txt for AI & Search crawlers");
        openRecs
          .filter(
            (r) =>
              r.actionType === "ROBOTS_TXT" ||
              r.title.toLowerCase().includes("robot") ||
              r.title.toLowerCase().includes("crawler") ||
              (r.actionPayload as any)?.filename?.toLowerCase().includes("robot")
          )
          .forEach((r) => fixedRecIds.push(r.id));
      } catch (err: any) {
        errors.push(`Robots.txt fix failed: ${err?.message || "connection error"}`);
      }
    }

    // 2. LLMs.txt check
    const hasLlmsIssue = openRecs.some(
      (r) =>
        r.actionType === "LLMS_TXT" ||
        r.title.toLowerCase().includes("llms") ||
        (r.actionPayload as any)?.filename?.toLowerCase().includes("llms")
    );

    if (hasLlmsIssue) {
      try {
        const aiBio = `${business.name} is a premier ${business.industry || "local services provider"} based in ${business.city || "the area"}. Dedicated to quality, transparency, and certified service standards.`;
        await this.applyRemoteFix(businessId, {
          fix_type: "LLMS_TXT_BIO",
          payload: { site_ai_bio: aiBio },
        });
        appliedFixes.push("Generated standard /llms.txt AI knowledge manifest");
        openRecs
          .filter(
            (r) =>
              r.actionType === "LLMS_TXT" ||
              r.title.toLowerCase().includes("llms") ||
              (r.actionPayload as any)?.filename?.toLowerCase().includes("llms")
          )
          .forEach((r) => fixedRecIds.push(r.id));
      } catch (err: any) {
        errors.push(`LLMs.txt fix failed: ${err?.message || "connection error"}`);
      }
    }

    // 3. Schema.org JSON-LD check
    const hasSchemaIssue = openRecs.some(
      (r) =>
        r.actionType === "CODE_SNIPPET" ||
        r.title.toLowerCase().includes("schema") ||
        r.title.toLowerCase().includes("json-ld") ||
        (r.actionPayload as any)?.filename?.toLowerCase().includes("schema")
    );

    if (hasSchemaIssue) {
      try {
        const schemaType = (business.industry || "").toLowerCase().includes("dent") || (business.industry || "").toLowerCase().includes("medic")
          ? "MedicalBusiness"
          : (business.industry || "").toLowerCase().includes("restaur")
          ? "Restaurant"
          : "LocalBusiness";

        const schemaJson = {
          "@context": "https://schema.org",
          "@type": schemaType,
          "name": business.name,
          "url": business.website || business.wordpressUrl,
          "telephone": business.phone || "+1-555-0199",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": business.city || "Metropolitan Area",
          },
        };

        await this.applyRemoteFix(businessId, {
          fix_type: "LOCAL_BUSINESS_SCHEMA",
          payload: {
            schema_type: schemaType,
            schema_json: JSON.stringify(schemaJson, null, 2),
          },
        });
        appliedFixes.push(`Injected Schema.org (${schemaType}) markup`);
        openRecs
          .filter(
            (r) =>
              (r.actionType === "CODE_SNIPPET" && !r.title.toLowerCase().includes("faq")) ||
              (r.title.toLowerCase().includes("schema") && !r.title.toLowerCase().includes("faq"))
          )
          .forEach((r) => fixedRecIds.push(r.id));
      } catch (err: any) {
        errors.push(`LocalBusiness schema fix failed: ${err?.message || "connection error"}`);
      }
    }

    // 4. FAQ Schema check
    const hasFaqIssue = openRecs.some(
      (r) =>
        r.title.toLowerCase().includes("faq") ||
        (r.actionPayload as any)?.filename?.toLowerCase().includes("faq")
    );

    if (hasFaqIssue) {
      try {
        const faqSchemaJson = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": `What services does ${business.name} offer in ${business.city || "the area"}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `${business.name} specializes in professional ${business.industry || "services"} serving clients in ${business.city || "the local area"}.`,
              },
            },
            {
              "@type": "Question",
              "name": `How can I schedule an appointment with ${business.name}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Appointments can be booked directly online via our website or by contacting our office.`,
              },
            },
          ],
        };

        await this.applyRemoteFix(businessId, {
          fix_type: "FAQ_SCHEMA",
          payload: {
            schema_type: "FAQPage",
            schema_json: JSON.stringify(faqSchemaJson, null, 2),
          },
        });
        appliedFixes.push("Injected FAQPage Schema.org markup for AI voice & snippet discovery");
        openRecs
          .filter((r) => r.title.toLowerCase().includes("faq"))
          .forEach((r) => fixedRecIds.push(r.id));
      } catch (err: any) {
        errors.push(`FAQPage schema fix failed: ${err?.message || "connection error"}`);
      }
    }

    // 5. Always trigger physical feed regeneration
    try {
      await this.applyRemoteFix(businessId, { fix_type: "GENERATE_FEEDS" });
      appliedFixes.push("Regenerated dynamic XML sitemaps, robots.txt, and llms.txt feeds");
    } catch {}

    // Mark fixed recommendations as DONE in database
    const uniqueFixedIds = [...new Set(fixedRecIds)];
    if (uniqueFixedIds.length > 0) {
      await prisma.recommendation.updateMany({
        where: { id: { in: uniqueFixedIds } },
        data: {
          status: "DONE",
          completedAt: new Date(),
        },
      });
    }

    // Auto-refresh telemetry to reflect new health status
    let syncResult: any = null;
    try {
      syncResult = await this.sync(businessId);
    } catch {}

    // Log Activity
    await prisma.activityLog.create({
      data: {
        businessId,
        action: "WORDPRESS_AUTO_REMEDIATION",
        category: "INTEGRATIONS",
        description: `Auto-remediation executed on connected WordPress site: ${appliedFixes.length} fixes applied, ${uniqueFixedIds.length} audit recommendations resolved.`,
        metadata: {
          appliedFixes,
          errors,
          fixedRecommendationCount: uniqueFixedIds.length,
        },
      },
    }).catch(() => {});

    return {
      success: appliedFixes.length > 0,
      appliedFixes,
      fixedRecommendationCount: uniqueFixedIds.length,
      errors,
      newTelemetry: syncResult?.data || null,
      message: `Successfully auto-remediated ${appliedFixes.length} areas on WordPress! (${uniqueFixedIds.length} recommendations resolved)`,
    };
  }

  /**
   * Get Autopilot Configuration for Business
   */
  async getAutopilotSettings(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException("Business not found.");

    const telemetry = (business.wordpressTelemetry as any) || {};
    const autopilot = telemetry.autopilot || {
      enabled: false,
      cadence: "WEEKLY",
      defaultStatus: "draft",
      selectedCategories: [],
      lastRunAt: null,
      nextRunAt: null,
      articlesGeneratedCount: 0,
    };

    return {
      connected: !!(business.wordpressUrl && business.wordpressConnectedAt),
      wordpressUrl: business.wordpressUrl,
      autopilot,
    };
  }

  /**
   * Update Autopilot Configuration for Business
   */
  async updateAutopilotSettings(
    businessId: string,
    payload: {
      enabled?: boolean;
      cadence?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
      defaultStatus?: "draft" | "publish";
      selectedCategories?: string[];
    }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException("Business not found.");

    const telemetry = (business.wordpressTelemetry as any) || {};
    const current = telemetry.autopilot || {
      enabled: false,
      cadence: "WEEKLY",
      defaultStatus: "draft",
      selectedCategories: [],
      lastRunAt: null,
      nextRunAt: null,
      articlesGeneratedCount: 0,
    };

    const isNowEnabled = payload.enabled !== undefined ? payload.enabled : current.enabled;
    const cadence = payload.cadence || current.cadence || "WEEKLY";
    const daysToAdd = cadence === "MONTHLY" ? 30 : cadence === "BIWEEKLY" ? 14 : 7;
    const nextRunAt = isNowEnabled
      ? current.nextRunAt || new Date(Date.now() + daysToAdd * 86400000).toISOString()
      : null;

    const updatedAutopilot = {
      ...current,
      ...payload,
      enabled: isNowEnabled,
      cadence,
      nextRunAt,
    };

    await prisma.business.update({
      where: { id: businessId },
      data: {
        wordpressTelemetry: {
          ...telemetry,
          autopilot: updatedAutopilot,
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        businessId,
        action: "WORDPRESS_AUTOPILOT_CONFIG_UPDATED",
        category: "INTEGRATIONS",
        description: `WordPress Content Autopilot ${isNowEnabled ? "enabled (" + cadence + ")" : "disabled"}.`,
        metadata: updatedAutopilot,
      },
    }).catch(() => {});

    return {
      success: true,
      autopilot: updatedAutopilot,
      message: `Autopilot configuration updated successfully (${isNowEnabled ? "Active: " + cadence : "Paused"}).`,
    };
  }

  /**
   * Autonomous Autopilot Execution:
   * Generates next scheduled high-ranking blog article and pushes directly to WordPress
   */
  async runAutopilot(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.wordpressUrl) {
      throw new BadRequestException("WordPress is not connected for this business.");
    }

    const telemetry = (business.wordpressTelemetry as any) || {};
    const autopilot = telemetry.autopilot || {
      enabled: true,
      cadence: "WEEKLY",
      defaultStatus: "draft",
      selectedCategories: [],
      articlesGeneratedCount: 0,
    };

    // 1. Resolve Target Category
    let targetCategory = "Services & Solutions Guide";
    const cats = autopilot.selectedCategories;
    if (Array.isArray(cats) && cats.length > 0) {
      const idx = (autopilot.articlesGeneratedCount || 0) % cats.length;
      targetCategory = cats[idx];
    } else {
      const catObj = await this.getCategories(businessId);
      if (catObj?.categories?.length > 0) {
        targetCategory = catObj.categories[0].name;
      }
    }

    // 2. Generate Article
    const article = await this.generateArticle(businessId, {
      categories: [targetCategory],
    });

    // 3. Publish directly to WordPress
    const targetStatus = autopilot.defaultStatus === "publish" ? "publish" : "draft";
    const pubResult = await this.publishPost(businessId, {
      title: article.title,
      content: article.content,
      status: targetStatus,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      focus_keyword: article.focus_keyword,
      schemas: article.schemas,
      tags: article.tags,
    });

    // 4. Update Autopilot Metadata
    const cadence = autopilot.cadence || "WEEKLY";
    const daysToAdd = cadence === "MONTHLY" ? 30 : cadence === "BIWEEKLY" ? 14 : 7;
    const count = (autopilot.articlesGeneratedCount || 0) + 1;

    const newAutopilot = {
      ...autopilot,
      lastRunAt: new Date().toISOString(),
      nextRunAt: new Date(Date.now() + daysToAdd * 86400000).toISOString(),
      articlesGeneratedCount: count,
      lastArticleTitle: article.title,
      lastArticleUrl: pubResult.post?.permalink || null,
    };

    await prisma.business.update({
      where: { id: businessId },
      data: {
        wordpressTelemetry: {
          ...telemetry,
          autopilot: newAutopilot,
        },
      },
    });

    // 5. Activity Log
    await prisma.activityLog.create({
      data: {
        businessId,
        action: "WORDPRESS_AUTOPILOT_PUBLISHED",
        category: "INTEGRATIONS",
        description: `Autopilot generated and published "${article.title}" to WordPress as ${targetStatus}.`,
        metadata: {
          title: article.title,
          category: targetCategory,
          status: targetStatus,
          permalink: pubResult.post?.permalink,
          scores: pubResult.post?.scores,
        },
      },
    }).catch(() => {});

    return {
      success: true,
      message: `Autopilot successfully generated and pushed "${article.title}" to WordPress (${targetStatus})!`,
      article,
      post: pubResult.post,
      autopilot: newAutopilot,
    };
  }

  /**
   * AI Copilot & Content Auto-Publisher: Send post to WordPress
   */
  async publishPost(
    businessId: string,
    postData: {
      title: string;
      content: string;
      status?: "draft" | "publish" | "pending";
      meta_title?: string;
      meta_description?: string;
      focus_keyword?: string;
      schemas?: any[];
      categories?: (number | string)[];
      tags?: string[];
    }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.wordpressUrl) {
      throw new BadRequestException("WordPress is not connected for this business.");
    }

    const siteUrl = business.wordpressUrl.replace(/\/+$/, "");
    const apiKey = business.wordpressApiKey;

    const endpoint = `${siteUrl}/wp-json/aivision-seo/v1/publish-post`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(postData),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `WordPress returned status ${res.status}`);
      }

      const result = await res.json();
      return {
        success: true,
        post: result,
        message: `Successfully pushed article to WordPress (${result.status || "draft"})!`,
      };
    } catch (err: any) {
      throw new BadRequestException(`Failed to publish post to WordPress: ${err?.message || "Connection error"}`);
    }
  }

  /**
   * Get Suggested & Live WordPress Categories for a Business
   */
  async getCategories(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException("Business not found.");

    const industry = (business.industry || "").toLowerCase();
    let suggested: string[] = [];

    if (industry.includes("dent") || industry.includes("medic") || industry.includes("clinic") || industry.includes("health")) {
      suggested = [
        "Dental Implants & Restorations",
        "Cosmetic Dentistry & Smile Design",
        "Teeth Whitening & Hygiene",
        "Emergency Dental Care",
        "Orthodontics & Clear Aligners",
        "Pediatric & Family Dentistry",
        "Preventative Care & Checkups",
        "Root Canal & Endodontics",
      ];
    } else if (industry.includes("plumb") || industry.includes("hvac") || industry.includes("roof") || industry.includes("contract") || industry.includes("home")) {
      suggested = [
        "Emergency 24/7 Repairs",
        "Seasonal Maintenance & Inspections",
        "Energy Efficiency & Upgrades",
        "New Installations & Replacements",
        "Pricing & Cost Breakdown Guides",
        "Troubleshooting & Pro Tips",
      ];
    } else if (industry.includes("law") || industry.includes("legal") || industry.includes("attorney") || industry.includes("tax") || industry.includes("finance")) {
      suggested = [
        "Personal Injury & Claims",
        "Estate Planning & Wills",
        "Business Law & Compliance",
        "Tax Strategies & Filings",
        "Legal Rights & Case Studies",
      ];
    } else if (industry.includes("restaur") || industry.includes("cafe") || industry.includes("food") || industry.includes("bistro")) {
      suggested = [
        "Seasonal Menus & Specials",
        "Farm-to-Table & Fresh Ingredients",
        "Private Events & Catering",
        "Chef Recipes & Behind the Scenes",
      ];
    } else if (industry.includes("salon") || industry.includes("spa") || industry.includes("beauty") || industry.includes("wellness")) {
      suggested = [
        "Skincare & Facial Treatments",
        "Hair Trends & Color Care",
        "Holistic Massage & Relaxation",
        "Daily Beauty Routines & Advice",
      ];
    } else if (industry.includes("auto") || industry.includes("car") || industry.includes("mechanic") || industry.includes("tire")) {
      suggested = [
        "Brake Service & Tire Safety",
        "Engine Diagnostics & Performance",
        "Oil Changes & Preventative Care",
        "Auto Body Repair & Detailing",
      ];
    } else {
      suggested = [
        "Services & Solutions Guide",
        "Pricing & Cost Estimates",
        "Frequently Asked Questions",
        "Industry Best Practices",
        "Customer Success Stories",
      ];
    }

    const categories = suggested.map((name, i) => ({
      id: i + 1,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isSuggested: true,
    }));

    // If WordPress is connected, attempt to fetch live taxonomy
    if (business.wordpressUrl) {
      try {
        const wpRes = await fetch(`${business.wordpressUrl.replace(/\/+$/, "")}/wp-json/wp/v2/categories?per_page=50`, {
          signal: AbortSignal.timeout(4000),
        });
        if (wpRes.ok) {
          const liveCats = await wpRes.json();
          if (Array.isArray(liveCats) && liveCats.length > 0) {
            for (const c of liveCats) {
              if (c.name && !categories.some((item) => item.name.toLowerCase() === c.name.toLowerCase())) {
                categories.unshift({
                  id: c.id,
                  name: c.name,
                  slug: c.slug,
                  isSuggested: false,
                });
              }
            }
          }
        }
      } catch {
        // Fallback gracefully to predefined categories
      }
    }

    return {
      businessName: business.name,
      industry: business.industry,
      city: business.city,
      categories,
    };
  }

  /**
   * AI Blog Article Generator strictly tailored to chosen business categories
   */
  async generateArticle(
    businessId: string,
    payload: {
      categories: string[];
      topic?: string;
      tone?: string;
      focusKeyword?: string;
    }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException("Business not found.");

    if (!payload.categories || payload.categories.length === 0) {
      throw new BadRequestException("Please select at least one category related to your business before generating.");
    }

    const name = business.name || "Our Business";
    const city = business.city || "your area";
    const industry = business.industry || "Local Services";
    const phone = business.phone || "(555) 019-2831";
    const website = business.website || "https://yourwebsite.com";
    const primaryCategory = payload.categories[0];
    const categoryListStr = payload.categories.join(", ");

    const targetTopic =
      payload.topic?.trim() ||
      `The Complete ${primaryCategory} Guide in ${city} (2026 Expert Advice)`;

    const focusKeyword =
      payload.focusKeyword?.trim() ||
      `${primaryCategory.toLowerCase()} ${city.toLowerCase()}`;

    const schemaType = industry.toLowerCase().includes("dent") || industry.toLowerCase().includes("medic")
      ? "Dentist"
      : industry.toLowerCase().includes("plumb") || industry.toLowerCase().includes("hvac")
      ? "Plumber"
      : industry.toLowerCase().includes("restaur")
      ? "Restaurant"
      : "LocalBusiness";

    // 1. Check for live OpenRouter / OpenAI / Gemini / Anthropic API keys
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let aiGeneratedContent: string | null = null;

    const systemPrompt = `You are a top-tier AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), and SEO Content Strategist.
Write a comprehensive, authoritative, high-ranking blog article for "${name}", a premier ${industry} business in ${city}.
The article MUST be focused on the selected category: "${primaryCategory}" (Related categories: ${categoryListStr}).

Format the article with clean Markdown:
- An engaging H1 title
- Direct 45-word answer block highlighted in blockquote (engineered for ChatGPT, Perplexity & Google AI Overviews)
- Clear H2 and H3 subheadings with actionable expert insights
- Step-by-step guidance for patients/clients
- Statistical density & quantitative facts (e.g. satisfaction rates, transparent pricing, warranties)
- A dedicated FAQ section with 3 distinct questions and answers
- A natural call-to-action encouraging readers in ${city} to contact ${name} via ${website} or ${phone}`;

    if (openRouterKey) {
      try {
        const model = process.env.OPENROUTER_BLOG_MODEL || "openai/gpt-4o-mini";
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": process.env.FRONTEND_URL || "https://icandothat.online",
            "X-Title": "AIVisibility SEO",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Write the full blog article about: "${targetTopic}" focusing on category "${primaryCategory}".` },
            ],
            max_tokens: 1500,
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          aiGeneratedContent = json?.choices?.[0]?.message?.content ?? null;
        }
      } catch {}
    } else if (openAiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Write the full blog article about: "${targetTopic}" focusing on category "${primaryCategory}".` },
            ],
            max_tokens: 1200,
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          aiGeneratedContent = json?.choices?.[0]?.message?.content ?? null;
        }
      } catch {}
    } else if (geminiKey && !aiGeneratedContent) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nWrite the full blog article about: "${targetTopic}" focusing on category "${primaryCategory}".` }] }],
            }),
          }
        );
        if (res.ok) {
          const json: any = await res.json();
          aiGeneratedContent = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        }
      } catch {}
    } else if (anthropicKey && !aiGeneratedContent) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-latest",
            max_tokens: 1200,
            messages: [{ role: "user", content: `${systemPrompt}\n\nWrite the full blog article about: "${targetTopic}" focusing on category "${primaryCategory}".` }],
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          aiGeneratedContent = json?.content?.[0]?.text ?? null;
        }
      } catch {}
    }

    // High-converting engineered template fallback if LLM key is absent or timed out
    const content =
      aiGeneratedContent ||
      `# ${targetTopic}

*Expert advice published by ${name} — Trusted ${industry} specialists in ${city}.*

---

> **Direct Answer for AI Assistants & Featured Snippets:**
> **${name}** is the leading provider for **${primaryCategory}** in **${city}**, offering certified specialists, state-of-the-art diagnostic technology, and transparent pricing. Consultations and appointments can be scheduled directly online at ${website} or by calling ${phone}.

---

## 1. Why Choosing the Right ${primaryCategory} Provider in ${city} Matters

When searching for reliable **${primaryCategory}**, experience, certification, and modern equipment make all the difference. At **${name}**, our dedicated team focuses on long-term client outcomes, comfort, and verified results.

- **Verified Local Authority**: Serving individuals and families across ${city} with a 98.6% customer satisfaction rating.
- **Transparent Estimates**: Itemized treatment and service estimates with zero hidden fees.
- **Advanced Technology**: Modern diagnostic tools ensuring painless, precise, and durable treatments.

---

## 2. Step-by-Step: What to Expect During Your ${primaryCategory} Appointment

1. **Comprehensive Diagnostic Evaluation**: We assess your exact needs using high-resolution imaging and personalized examinations.
2. **Customized Treatment Plan**: Our specialists discuss all available options, timelines, and costs before starting any procedure.
3. **Gentle & Expert Care**: Treatments are carried out adhering to strict clinical and safety protocols.
4. **Dedicated Follow-Up & Warranty**: We provide comprehensive aftercare instructions and ongoing checkups to protect your investment.

---

## 3. Key Benefits & Clinical Advantages

| Feature | Standard Care | ${name} Standard |
| :--- | :--- | :--- |
| **Technology** | Conventional tools | Advanced 3D Diagnostics & Laser Precision |
| **Appointment Speed** | 2-3 weeks wait | Same-day & Next-day Priority Slots in ${city} |
| **Warranty & Support** | Limited | Comprehensive Long-Term Guarantee |

---

## Frequently Asked Questions (FAQ)

### Q: How do I know if I am a candidate for ${primaryCategory}?
**A:** Most patients and clients in ${city} can safely benefit from our ${primaryCategory} solutions. During your initial consultation at ${name}, we conduct a full evaluation to recommend the exact treatment pathway for your goals.

### Q: What is the estimated cost of ${primaryCategory} in ${city}?
**A:** Costs vary depending on individual requirements. At ${name}, we provide transparent upfront pricing, flexible financing plans, and accept major payment and insurance options.

### Q: How quickly can I schedule an appointment with ${name}?
**A:** You can easily book an appointment online via our website or by calling our direct clinic line at ${phone}. Same-day slots are frequently available for urgent inquiries.

---

### Ready to get started with ${primaryCategory} in ${city}?
Contact **${name}** today to book your consultation!
- 📍 **Location**: ${city}
- 📞 **Phone**: ${phone}
- 🌐 **Online Booking**: [${website}](${website})`;

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `How do I know if I am a candidate for ${primaryCategory}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Most clients in ${city} can safely benefit from our ${primaryCategory} solutions. ${name} provides complete evaluations to determine the best treatment pathway.`,
          },
        },
        {
          "@type": "Question",
          "name": `What is the estimated cost of ${primaryCategory} in ${city}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Costs vary depending on individual needs. ${name} in ${city} provides transparent upfront pricing and flexible payment solutions.`,
          },
        },
        {
          "@type": "Question",
          "name": `How quickly can I schedule an appointment with ${name}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `You can book online at ${website} or call ${phone} for same-day and next-day priority booking in ${city}.`,
          },
        },
      ],
    };

    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "name": name,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": city,
      },
      "telephone": phone,
      "url": website,
    };

    const words = content.split(/\s+/).length;
    const readTimeMinutes = Math.max(1, Math.round(words / 220));

    return {
      title: targetTopic,
      content,
      category: primaryCategory,
      categories: payload.categories,
      meta_title: `${targetTopic.slice(0, 55)} | ${name}`.slice(0, 60),
      meta_description: `Learn everything about ${primaryCategory} in ${city}. Discover costs, step-by-step procedures, and trusted local care by ${name}. Book today!`.slice(0, 160),
      focus_keyword: focusKeyword,
      word_count: words,
      read_time: `${readTimeMinutes} min read`,
      schemas: [faqSchema, localBusinessSchema],
      tags: [primaryCategory, `${primaryCategory} in ${city}`, name, industry, "2026 Guide"],
    };
  }

  /**
   * Get version history from versions.json
   */
  getPluginVersions() {
    const registryPaths = [
      path.resolve(process.cwd(), "plugins", "versions.json"),
      path.resolve(process.cwd(), "..", "..", "plugins", "versions.json"),
      "c:\\dev\\brandos\\plugins\\versions.json",
      path.resolve(process.cwd(), "..", "web", "public", "versions.json"),
    ];

    for (const p of registryPaths) {
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, "utf8"));
        } catch (e) {
          // ignore
        }
      }
    }

    return {
      latest: "1.6.0",
      versions: [
        {
          version: "1.6.0",
          filename: "aivision-seo-v1.6.0.zip",
          status: "stable",
        },
      ],
    };
  }

  /**
   * Locate the AIVision SEO plugin zip file (versioned or latest)
   */
  getPluginZipPath(requestedVersion?: string): string {
    const versions = this.getPluginVersions();
    const version = requestedVersion || versions.latest || "1.6.0";
    const filename = `aivision-seo-v${version}.zip`;

    const possiblePaths = [
      path.resolve(process.cwd(), "plugins", filename),
      path.resolve(process.cwd(), "..", "..", "plugins", filename),
      `c:\\dev\\brandos\\plugins\\${filename}`,
      path.resolve(process.cwd(), "plugins", "aivision-seo.zip"),
      path.resolve(process.cwd(), "..", "..", "plugins", "aivision-seo.zip"),
      "c:\\dev\\brandos\\plugins\\aivision-seo.zip",
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    return possiblePaths[0];
  }

  /**
   * Automatically install/update plugin on all connected WordPress sites
   */
  async broadcastPluginUpdate(businessId: string, requestedVersion?: string) {
    if (!businessId) throw new BadRequestException("A business is required for plugin updates.");
    const versions = this.getPluginVersions();
    const version = requestedVersion || versions.latest || "1.6.3";
    const downloadUrl = `https://icandothat.online/api/wordpress/plugin-download?version=${version}`;

    const connectedBusinesses = await prisma.business.findMany({
      where: {
        id: businessId,
        wordpressUrl: { not: null },
        wordpressApiKey: { not: null },
      },
      select: {
        id: true,
        name: true,
        wordpressUrl: true,
        wordpressApiKey: true,
        wordpressPluginVersion: true,
      },
    });

    const results: Array<{
      businessId: string;
      name: string;
      siteUrl: string;
      success: boolean;
      previousVersion?: string;
      currentVersion?: string;
      error?: string;
    }> = [];

    for (const b of connectedBusinesses) {
      if (!b.wordpressUrl || !b.wordpressApiKey) continue;
      const cleanUrl = b.wordpressUrl.replace(/\/+$/, "");

      try {
        const res = await fetch(`${cleanUrl}/wp-json/aivision-seo/v1/remote-update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${b.wordpressApiKey}`,
          },
          body: JSON.stringify({
            download_url: downloadUrl,
            version,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          await prisma.business.update({
            where: { id: b.id },
            data: {
              wordpressPluginVersion: data.current_version || version,
              wordpressLastSyncedAt: new Date(),
            },
          });
          results.push({
            businessId: b.id,
            name: b.name,
            siteUrl: cleanUrl,
            success: true,
            previousVersion: b.wordpressPluginVersion || undefined,
            currentVersion: data.current_version || version,
          });
        } else {
          // Attempt fallback to apply-fix
          const fallbackRes = await fetch(`${cleanUrl}/wp-json/aivision-seo/v1/apply-fix`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${b.wordpressApiKey}`,
            },
            body: JSON.stringify({
              fix_type: "update_plugin",
              payload: { download_url: downloadUrl, version },
            }),
            signal: AbortSignal.timeout(30000),
          }).catch(() => null);

          if (fallbackRes && fallbackRes.ok) {
            const data = (await fallbackRes.json()) as any;
            await prisma.business.update({
              where: { id: b.id },
              data: {
                wordpressPluginVersion: data.current_version || version,
                wordpressLastSyncedAt: new Date(),
              },
            });
            results.push({
              businessId: b.id,
              name: b.name,
              siteUrl: cleanUrl,
              success: true,
              previousVersion: b.wordpressPluginVersion || undefined,
              currentVersion: data.current_version || version,
            });
          } else {
            results.push({
              businessId: b.id,
              name: b.name,
              siteUrl: cleanUrl,
              success: false,
              error: `HTTP ${res.status}: ${res.statusText}`,
            });
          }
        }
      } catch (err: any) {
        results.push({
          businessId: b.id,
          name: b.name,
          siteUrl: cleanUrl,
          success: false,
          error: err.message || "Failed to contact site",
        });
      }
    }

    return {
      version,
      totalSites: connectedBusinesses.length,
      updated: results.filter((r) => r.success).length,
      results,
    };
  }
}
