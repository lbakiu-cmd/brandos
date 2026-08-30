import { prisma } from "@brandos/database";
import {
  evaluateWebsiteHtml,
  fetchHtmlSafe,
  evaluateGoogleBusinessProfile,
  evaluateSocialPresence,
  generateRobotsTxtFix,
  generateLlmsTxt,
  generateJsonLdSchema,
  generateSocialBioSnippet,
  type WebsiteCheck,
  type GbpCheck,
  type SocialCheck,
} from "@brandos/audit-engine";

async function upsertRecommendation(data: {
  businessId: string;
  sourceType: string;
  sourceId: string;
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  actionType?: string | null;
  actionPayload?: any;
  expectedImpact: number;
  estimatedEffort: number;
}) {
  const existing = await prisma.recommendation.findFirst({
    where: {
      businessId: data.businessId,
      title: data.title,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return prisma.recommendation.update({
      where: { id: existing.id },
      data: {
        sourceId: data.sourceId,
        category: data.category,
        priority: data.priority as any,
        description: data.description,
        actionType: data.actionType ?? existing.actionType,
        actionPayload: data.actionPayload ?? existing.actionPayload,
        expectedImpact: data.expectedImpact,
        estimatedEffort: data.estimatedEffort,
      },
    });
  }

  return prisma.recommendation.create({
    data: {
      businessId: data.businessId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      category: data.category,
      priority: data.priority as any,
      title: data.title,
      description: data.description,
      actionType: data.actionType,
      actionPayload: data.actionPayload,
      expectedImpact: data.expectedImpact,
      estimatedEffort: data.estimatedEffort,
      status: "OPEN",
    },
  });
}

export async function runWebsiteAudit(auditId: string) {
  const audit = await prisma.websiteAudit.findUnique({
    where: { id: auditId },
    include: { business: true },
  });
  if (!audit) return;

  await prisma.websiteAudit.update({
    where: { id: auditId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    const [html, robotsTxt, llmsTxt] = await Promise.all([
      fetchHtmlSafe(audit.url),
      fetchHtmlSafe(new URL("/robots.txt", audit.url).toString()),
      fetchHtmlSafe(new URL("/llms.txt", audit.url).toString()),
    ]);
    const cleanHtml = html || `<html><head><title>${audit.business.name}</title></head><body><h1>${audit.business.name}</h1></body></html>`;
    const result = evaluateWebsiteHtml(
      audit.url,
      cleanHtml,
      robotsTxt ?? undefined,
      llmsTxt ?? undefined,
      audit.business.industry
    );

    await prisma.websiteAudit.update({
      where: { id: auditId },
      data: {
        score: result.score,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Create findings & recommendations
    for (const f of result.checks) {
      await prisma.auditFinding.create({
        data: {
          auditId,
          category: f.category,
          severity: f.severity as any,
          title: f.title,
          description: f.description,
          recommendation: f.recommendation,
          impactPoints: f.impact,
          effortMinutes: 15,
          passed: f.passed,
        },
      });

      // Auto create/update recommendations with 1-click code fixes for failed checks
      if (!f.passed) {
        let actionType: string | null = null;
        let actionPayload: any = null;

        if (f.fixType === "ROBOTS_TXT") {
          const fix = generateRobotsTxtFix();
          actionType = fix.actionType;
          actionPayload = fix;
        } else if (f.fixType === "LLMS_TXT") {
          const fix = generateLlmsTxt(audit.business);
          actionType = fix.actionType;
          actionPayload = fix;
        } else if (f.fixType === "CODE_SNIPPET" || f.fixType === "AEO_SNIPPET") {
          const fix = generateJsonLdSchema(audit.business);
          actionType = fix.actionType;
          actionPayload = fix;
        }

        await upsertRecommendation({
          businessId: audit.businessId,
          sourceType: "WEBSITE_AUDIT",
          sourceId: audit.id,
          category: f.category,
          priority: f.severity === "CRITICAL" ? "HIGH" : f.severity === "HIGH" ? "HIGH" : "MEDIUM",
          title: f.title,
          description: f.description + (f.recommendation ? " Action: " + f.recommendation : ""),
          actionType,
          actionPayload,
          expectedImpact: f.impact,
          estimatedEffort: 15,
        });
      } else {
        // Auto-resolve when check passes
        await prisma.recommendation.updateMany({
          where: {
            businessId: audit.businessId,
            title: f.title,
            status: "OPEN",
          },
          data: {
            status: "DONE",
            completedAt: new Date(),
          },
        });
      }
    }
  } catch (err: any) {
    await prisma.websiteAudit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: err.message,
      },
    });
  }
}

export async function runGbpAudit(gbpAuditId: string) {
  const audit = await prisma.gbpAudit.findUnique({
    where: { id: gbpAuditId },
    include: { business: true },
  });
  if (!audit) return;

  await prisma.gbpAudit.update({
    where: { id: gbpAuditId },
    data: { status: "RUNNING" },
  });

  try {
    const biz = audit.business;
    const { score, metrics, checks } = evaluateGoogleBusinessProfile({
      businessName: biz.name,
      website: biz.website || undefined,
      phone: biz.phone || undefined,
      city: biz.city || undefined,
      category: biz.industry || undefined,
    });

    const failed = checks.filter((c: GbpCheck) => !c.passed);
    for (const f of failed) {
      await upsertRecommendation({
        businessId: biz.id,
        sourceType: "GBP_AUDIT",
        sourceId: gbpAuditId,
        category: "Google Business",
        priority: f.score >= 20 ? "HIGH" : "MEDIUM",
        title: f.title,
        description: f.description,
        expectedImpact: f.score,
        estimatedEffort: 15,
      });
    }

    await prisma.gbpAudit.update({
      where: { id: gbpAuditId },
      data: { status: "COMPLETED", completedAt: new Date(), score, metrics },
    });
  } catch {
    await prisma.gbpAudit.update({
      where: { id: gbpAuditId },
      data: { status: "FAILED", completedAt: new Date() },
    });
  }
}

export async function runSocialAudit(socialAuditId: string) {
  const audit = await prisma.socialAudit.findUnique({
    where: { id: socialAuditId },
    include: { business: { include: { integrations: true } } },
  });
  if (!audit) return;

  await prisma.socialAudit.update({
    where: { id: socialAuditId },
    data: { status: "RUNNING" },
  });

  try {
    const biz = audit.business;
    const platforms = biz.integrations.map((a) => a.provider);

    const { score, metrics, checks } = evaluateSocialPresence({
      connectedPlatforms: platforms,
      scheduledPostCount: 0,
      recentPostCount: 12,
    });

    const failed = checks.filter((c: SocialCheck) => !c.passed);
    for (const f of failed) {
      let actionType: string | null = null;
      let actionPayload: any = null;

      if (f.fixType === "SOCIAL_BIO") {
        const fix = generateSocialBioSnippet(biz);
        actionType = fix.actionType;
        actionPayload = fix;
      }

      await upsertRecommendation({
        businessId: biz.id,
        sourceType: "SOCIAL_AUDIT",
        sourceId: socialAuditId,
        category: "Social Presence",
        priority: f.score >= 20 ? "HIGH" : "MEDIUM",
        title: f.title,
        description: f.description,
        actionType,
        actionPayload,
        expectedImpact: f.score,
        estimatedEffort: 10,
      });
    }

    await prisma.socialAudit.update({
      where: { id: socialAuditId },
      data: { status: "COMPLETED", completedAt: new Date(), score, metrics },
    });
  } catch {
    await prisma.socialAudit.update({
      where: { id: socialAuditId },
      data: { status: "FAILED", completedAt: new Date() },
    });
  }
}