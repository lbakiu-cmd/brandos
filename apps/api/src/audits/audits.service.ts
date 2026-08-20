import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { prisma, RecommendationStatus } from "@brandos/database";
import {
  calculateCompositeBrandScore,
  evaluateWebsiteHtml,
  fetchHtmlSafe,
} from "@brandos/audit-engine";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

@Injectable()
export class AuditsService {
  private websiteQueue = new Queue("audit", { connection: redisConnection() });
  private gbpQueue = new Queue("gbp-audit", { connection: redisConnection() });
  private socialQueue = new Queue("social-audit", { connection: redisConnection() });
  private aiQueue = new Queue("ai-visibility", { connection: redisConnection() });

  async publicScan(urlInput: string, businessName?: string, city?: string) {
    if (!urlInput || !urlInput.trim()) {
      throw new BadRequestException("Please enter a website URL.");
    }
    let targetUrl = urlInput.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      new URL(targetUrl);
    } catch {
      throw new BadRequestException("Please enter a valid website URL (e.g. example.com).");
    }

    const [html, robotsTxt, llmsTxt] = await Promise.all([
      fetchHtmlSafe(targetUrl),
      fetchHtmlSafe(new URL("/robots.txt", targetUrl).toString()),
      fetchHtmlSafe(new URL("/llms.txt", targetUrl).toString()),
    ]);

    if (html === null) {
      throw new BadRequestException(`Could not reach ${targetUrl}. Please ensure the website is online and publicly accessible.`);
    }

    const parsedHostname = new URL(targetUrl).hostname.replace(/^www\./, "");
    const cleanBizName = businessName?.trim() || parsedHostname.split(".")[0].toUpperCase();

    const { score: websiteScore, vertical, checks } = evaluateWebsiteHtml(
      targetUrl,
      html,
      robotsTxt ?? undefined,
      llmsTxt ?? undefined,
      businessName || cleanBizName
    );

    const failedChecks = checks.filter((c) => !c.passed);
    const passedChecks = checks.filter((c) => c.passed);
    const criticalRedFlags = failedChecks.filter((c) => c.severity === "CRITICAL" || c.severity === "HIGH");

    const composite = calculateCompositeBrandScore({
      websiteScore,
      gbpScore: 50, // Baseline estimate for unlinked public scan
      aiVisibilityScore: websiteScore < 50 ? 25 : 60, // Estimated AI search citation index
      socialScore: 50,
    });

    return {
      url: targetUrl,
      domain: parsedHostname,
      businessName: cleanBizName,
      city: city?.trim() || "",
      scannedAt: new Date().toISOString(),
      composite,
      websiteScore,
      totalChecksCount: checks.length,
      passedCount: passedChecks.length,
      failedCount: failedChecks.length,
      criticalRedFlags: criticalRedFlags.slice(0, 3), // Top 3 exposed
      lockedFindingsCount: Math.max(0, failedChecks.length - 3),
      checksPreview: checks.map((c, idx) => ({
        title: c.title,
        category: c.category,
        severity: c.severity,
        passed: c.passed,
        recommendation: c.passed ? null : idx < 3 ? c.recommendation : "Locked in full report",
        isLocked: !c.passed && idx >= 3,
      })),
    };
  }

  async bulkScan(items: Array<{ url: string; businessName?: string; city?: string }>) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException("Please provide a list of URLs to scan.");
    }
    const limited = items.slice(0, 15);

    const results = await Promise.allSettled(
      limited.map(async (item) => {
        try {
          const scan = await this.publicScan(item.url, item.businessName, item.city);
          const topGap = scan.criticalRedFlags[0]?.title || "Missing Schema.org JSON-LD structured data";
          const pitch = `Hi ${scan.businessName} Team,\n\nI ran an AI discovery health check on ${scan.domain} in ${scan.city || "your area"}. Your Brand Score is ${scan.composite.overallScore}/100.\n\nTop urgent gap: ${topGap}.\n\nI've generated a full PDF report and 1-click code fixes to boost your local rank in ChatGPT & Google. Open to a 10-min review this week?`;

          return {
            status: "SUCCESS",
            url: scan.url,
            domain: scan.domain,
            businessName: scan.businessName,
            city: scan.city,
            overallScore: scan.composite.overallScore,
            grade: scan.composite.grade,
            gradeLabel: scan.composite.gradeLabel,
            criticalRedFlags: scan.criticalRedFlags,
            pitch,
          };
        } catch (err: any) {
          return {
            status: "ERROR",
            url: item.url,
            businessName: item.businessName || item.url,
            city: item.city || "",
            overallScore: 0,
            grade: "F",
            gradeLabel: "Unreachable",
            criticalRedFlags: [],
            pitch: "",
          };
        }
      })
    );

    const successful = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean);

    successful.sort((a: any, b: any) => a.overallScore - b.overallScore);

    return successful;
  }

  async startAudit(userId: string, url: string) {
    try {
      new URL(url);
    } catch {
      throw new BadRequestException("Invalid URL format.");
    }
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");

    if (!membership.business.website || membership.business.website !== url) {
      await prisma.business.update({
        where: { id: membership.businessId },
        data: { website: url },
      });
    }

    const audit = await prisma.websiteAudit.create({
      data: { businessId: membership.businessId, url, status: "QUEUED" },
    });

    await this.websiteQueue.add("audit", { auditId: audit.id }, { jobId: audit.id });
    return audit;
  }

  async startOmniAudit(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");
    const businessId = membership.businessId;
    const biz = membership.business;

    const results: Record<string, any> = {};

    // 1. Website Audit (if website exists)
    if (biz.website) {
      const webAudit = await prisma.websiteAudit.create({
        data: { businessId, url: biz.website, status: "QUEUED" },
      });
      await this.websiteQueue.add("audit", { auditId: webAudit.id }, { jobId: webAudit.id });
      results.websiteAudit = webAudit;
    }

    // 2. Google Business Profile Audit
    const gbpAudit = await prisma.gbpAudit.create({
      data: { businessId, status: "QUEUED" },
    });
    await this.gbpQueue.add("gbp-audit", { gbpAuditId: gbpAudit.id }, { jobId: gbpAudit.id });
    results.gbpAudit = gbpAudit;

    // 3. Social Media Audit
    const socialAudit = await prisma.socialAudit.create({
      data: { businessId, status: "QUEUED" },
    });
    await this.socialQueue.add("social-audit", { socialAuditId: socialAudit.id }, { jobId: socialAudit.id });
    results.socialAudit = socialAudit;

    // 4. AI Search Visibility Report
    const aiReport = await prisma.aiVisibilityReport.create({
      data: { businessId },
    });
    await this.aiQueue.add("ai-visibility", { reportId: aiReport.id }, { jobId: aiReport.id });
    results.aiReport = aiReport;

    return {
      message: "Omnichannel audit queued successfully for all channels.",
      businessId,
      ...results,
    };
  }

  async getOverview(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { business: true },
    });
    const businessIds = memberships.map((m) => m.businessId);

    const [latestWeb, latestGbp, latestSocial, latestAi, recommendations, firstBiz] = await Promise.all([
      prisma.websiteAudit.findFirst({
        where: { businessId: { in: businessIds }, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.gbpAudit.findFirst({
        where: { businessId: { in: businessIds }, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.socialAudit.findFirst({
        where: { businessId: { in: businessIds }, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.aiVisibilityReport.findFirst({
        where: { businessId: { in: businessIds }, overallScore: { not: null } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.recommendation.findMany({
        where: { businessId: { in: businessIds } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      prisma.business.findFirst({
        where: { id: { in: businessIds } },
        select: {
          id: true,
          wordpressUrl: true,
          wordpressSiteName: true,
          wordpressPluginVersion: true,
          wordpressConnectedAt: true,
        },
      }),
    ]);

    const composite = calculateCompositeBrandScore({
      websiteScore: latestWeb?.score ?? null,
      gbpScore: latestGbp?.score ?? null,
      aiVisibilityScore: latestAi?.overallScore ?? null,
      socialScore: latestSocial?.score ?? null,
    });

    return {
      composite,
      latestWeb,
      latestGbp,
      latestSocial,
      latestAi,
      recommendations,
      wordpress: firstBiz
        ? {
            connected: !!(firstBiz.wordpressUrl && firstBiz.wordpressConnectedAt),
            url: firstBiz.wordpressUrl,
            siteName: firstBiz.wordpressSiteName,
            version: firstBiz.wordpressPluginVersion || "1.4.1",
          }
        : null,
      stats: {
        totalRecs: recommendations.length,
        openRecs: recommendations.filter((r) => r.status === "OPEN").length,
        doneRecs: recommendations.filter((r) => r.status === "DONE").length,
      },
    };
  }

  async list(userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    return prisma.websiteAudit.findMany({
      where: { businessId: { in: memberships.map((m) => m.businessId) } },
      orderBy: { createdAt: "desc" },
      include: { findings: true },
    });
  }

  async get(id: string, userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    const businessIds = memberships.map((m) => m.businessId);

    const audit = await prisma.websiteAudit.findFirst({
      where: { id, businessId: { in: businessIds } },
      include: { findings: true },
    });

    if (!audit) throw new NotFoundException("Audit not found.");
    return audit;
  }

  async recommendations(userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    return prisma.recommendation.findMany({
      where: { businessId: { in: memberships.map((m) => m.businessId) } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  }

  async updateRecommendationStatus(id: string, status: RecommendationStatus, userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    const businessIds = memberships.map((m) => m.businessId);

    const rec = await prisma.recommendation.findFirst({
      where: { id, businessId: { in: businessIds } },
    });

    if (!rec) throw new NotFoundException("Recommendation not found.");

    return prisma.recommendation.update({
      where: { id },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      },
    });
  }
}