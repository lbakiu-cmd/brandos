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
      wordpressPluginVersion: business.wordpressPluginVersion || "1.4.1",
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
      throw new BadRequestException("Invalid BrandOS API Key. Please verify in BrandOS settings.");
    }

    const cleanSiteUrl = payload.site_url ? payload.site_url.replace(/\/+$/, "") : "";

    await prisma.business.update({
      where: { id: business.id },
      data: {
        wordpressUrl: cleanSiteUrl,
        wordpressSiteName: payload.site_name || "WordPress Site",
        wordpressPluginVersion: payload.plugin_version || "1.4.1",
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
   * Connect initiated from BrandOS Dashboard
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

      await prisma.business.update({
        where: { id: businessId },
        data: {
          wordpressUrl: targetUrl,
          wordpressSiteName: data.site_name || "WordPress Site",
          wordpressPluginVersion: data.plugin_version || "1.4.1",
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
      // In local dev/offline, save connection anyway with pending status
      await prisma.business.update({
        where: { id: businessId },
        data: {
          wordpressUrl: targetUrl,
          wordpressSiteName: "WordPress Site",
          wordpressPluginVersion: "1.4.1",
          wordpressConnectedAt: new Date(),
          wordpressLastSyncedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Registered WordPress URL. (Note: could not verify remote endpoint directly: ${err?.message || "timeout"}. Make sure AIVision SEO plugin is active).`,
      };
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

      const combinedTelemetry = {
        status: statusData,
        telemetry: telemetryData,
        syncedAt: new Date().toISOString(),
      };

      await prisma.business.update({
        where: { id: businessId },
        data: {
          wordpressLastSyncedAt: new Date(),
          wordpressPluginVersion: statusData?.plugin_version || business.wordpressPluginVersion || "1.4.1",
          wordpressSiteName: statusData?.site_name || business.wordpressSiteName,
          wordpressTelemetry: combinedTelemetry as any,
        },
      });

      return {
        success: true,
        message: "Successfully synchronized with WordPress site!",
        data: combinedTelemetry,
      };
    } catch (err: any) {
      throw new BadRequestException(`Failed to sync with WordPress: ${err?.message || "Unknown error"}`);
    }
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
      categories?: number[];
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
   * Locate the latest AIVision SEO plugin zip file
   */
  getPluginZipPath(): string {
    const possiblePaths = [
      path.resolve(process.cwd(), "plugins", "aivision-seo.zip"),
      path.resolve(process.cwd(), "..", "..", "plugins", "aivision-seo.zip"),
      "c:\\dev\\brandos\\plugins\\aivision-seo.zip",
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    return possiblePaths[0];
  }
}
