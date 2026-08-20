import { prisma } from "@brandos/database";
import {
  evaluateWebsiteHtml,
  fetchHtmlSafe,
  evaluateGoogleBusinessProfile,
  evaluateSocialPresence,
  generateJsonLdSchema,
  generateLlmsTxt,
  generateRobotsTxtFix,
  generateReviewReplyTemplate,
  generateSocialBioSnippet,
  WebsiteCheck,
  GbpCheck,
  SocialCheck,
} from "@brandos/audit-engine";

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
    const base = audit.url;
    const [html, robotsTxt, llmsTxt] = await Promise.all([
      fetchHtmlSafe(base),
      fetchHtmlSafe(new URL("/robots.txt", base).toString()),
      fetchHtmlSafe(new URL("/llms.txt", base).toString()),
    ]);

    if (html === null) {
      throw new Error(`Could not reach ${base}. Check if the URL is accessible.`);
    }

    const { score, checks } = evaluateWebsiteHtml(
      base,
      html,
      robotsTxt ?? undefined,
      llmsTxt ?? undefined,
      audit.business.industry || audit.business.name
    );

    // Save individual findings
    await prisma.auditFinding.createMany({
      data: checks.map((c: WebsiteCheck) => ({
        auditId,
        category: c.category,
        severity: c.severity,
        title: c.title,
        description: c.description,
        recommendation: c.recommendation,
        passed: c.passed,
        impactPoints: c.impact,
      })),
    });

    // Create actionable recommendations with code/template fixes
    const failedChecks = checks.filter((c: WebsiteCheck) => !c.passed && ["CRITICAL", "HIGH", "MEDIUM"].includes(c.severity));

    for (const f of failedChecks) {
      let actionType: string | null = null;
      let actionPayload: any = null;

      if (f.fixType === "CODE_SNIPPET" && f.title.includes("Schema.org")) {
        const fix = generateJsonLdSchema(audit.business);
        actionType = fix.actionType;
        actionPayload = fix;
      } else if (f.fixType === "LLMS_TXT" || f.title.includes("llms.txt")) {
        const fix = generateLlmsTxt(audit.business);
        actionType = fix.actionType;
        actionPayload = fix;
      } else if (f.fixType === "ROBOTS_TXT" || f.title.includes("robots.txt")) {
        const fix = generateRobotsTxtFix();
        actionType = fix.actionType;
        actionPayload = fix;
      }

      await prisma.recommendation.create({
        data: {
          businessId: audit.businessId,
          sourceType: "WEBSITE_AUDIT",
          sourceId: auditId,
          category: f.category,
          priority: f.severity === "CRITICAL" || f.severity === "HIGH" ? "HIGH" : "MEDIUM",
          title: f.title,
          description: f.recommendation,
          actionType: actionType ?? undefined,
          actionPayload: actionPayload ?? undefined,
          expectedImpact: f.impact,
          estimatedEffort: f.severity === "CRITICAL" ? 15 : 30,
        },
      });
    }

    await prisma.websiteAudit.update({
      where: { id: auditId },
      data: { status: "COMPLETED", completedAt: new Date(), score },
    });
  } catch (e: any) {
    await prisma.websiteAudit.update({
      where: { id: auditId },
      data: { status: "FAILED", error: String(e?.message || e), completedAt: new Date() },
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
      category: biz.industry,
      city: biz.city,
      phone: biz.phone,
      website: biz.website,
    });

    const failed = checks.filter((c: GbpCheck) => !c.passed);
    for (const f of failed) {
      let actionType: string | null = null;
      let actionPayload: any = null;

      if (f.fixType === "GBP_REVIEWS") {
        const fix = generateReviewReplyTemplate(biz.name);
        actionType = fix.actionType;
        actionPayload = fix;
      }

      await prisma.recommendation.create({
        data: {
          businessId: audit.businessId,
          sourceType: "GBP_AUDIT",
          sourceId: gbpAuditId,
          category: "LOCAL_SEO",
          priority: f.severity === "CRITICAL" || f.severity === "HIGH" ? "HIGH" : "MEDIUM",
          title: f.title,
          description: f.recommendation,
          actionType: actionType ?? undefined,
          actionPayload: actionPayload ?? undefined,
          expectedImpact: f.maxScore,
          estimatedEffort: 20,
        },
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
    include: { business: { include: { socialAccounts: true, posts: true } } },
  });
  if (!audit) return;

  await prisma.socialAudit.update({
    where: { id: socialAuditId },
    data: { status: "RUNNING" },
  });

  try {
    const biz = audit.business;
    const platforms = biz.socialAccounts.map((a) => a.platform);
    const scheduled = biz.posts.filter((p) => p.status === "SCHEDULED").length;
    const published = biz.posts.filter((p) => p.status === "PUBLISHED").length;

    const { score, metrics, checks } = evaluateSocialPresence({
      connectedPlatforms: platforms,
      scheduledPostCount: scheduled,
      recentPostCount: published,
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

      await prisma.recommendation.create({
        data: {
          businessId: audit.businessId,
          sourceType: "SOCIAL_AUDIT",
          sourceId: socialAuditId,
          category: "SOCIAL_PRESENCE",
          priority: f.severity === "HIGH" ? "HIGH" : "MEDIUM",
          title: f.title,
          description: f.recommendation,
          actionType: actionType ?? undefined,
          actionPayload: actionPayload ?? undefined,
          expectedImpact: f.maxScore,
          estimatedEffort: 15,
        },
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