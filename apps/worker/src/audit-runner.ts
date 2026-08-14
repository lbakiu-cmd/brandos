import { prisma } from "@brandos/database";

type Check = {
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description: string;
  recommendation: string;
  passed: boolean;
  impact: number;
};

const WEIGHTS: Record<Check["severity"], number> = {
  CRITICAL: 25, HIGH: 15, MEDIUM: 10, LOW: 5, INFO: 2,
};

async function safeFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BrandOS-Audit/1.0" }, redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

export async function runWebsiteAudit(auditId: string) {
  const audit = await prisma.websiteAudit.findUnique({ where: { id: auditId } });
  if (!audit) return;

  await prisma.websiteAudit.update({ where: { id: auditId }, data: { status: "RUNNING", startedAt: new Date() } });

  try {
    const base = audit.url;
    const html = await safeFetch(base);
    if (html === null) throw new Error("Could not fetch the website.");

    const checks: Check[] = [];
    const add = (category: string, severity: Check["severity"], title: string, passed: boolean, recommendation: string, description: string) =>
      checks.push({ category, severity, title, passed, recommendation, description, impact: WEIGHTS[severity] });

    add("TECHNICAL", "HIGH", "Descriptive title tag", /<title[^>]*>[^<]{10,}<\/title>/i.test(html), "Write a unique 30-60 character <title>.", "Search engines use the title as the primary page signal.");
    add("TECHNICAL", "HIGH", "Meta description present", /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{40,}["']/i.test(html), "Add a 140-160 character meta description.", "Used by engines to summarize your page.");
    add("TECHNICAL", "MEDIUM", "Single H1 heading", /<h1[\s>]/i.test(html), "Use exactly one <h1>.", "Headings define the content hierarchy.");
    add("TECHNICAL", "MEDIUM", "Canonical URL set", /<link[^>]+rel=["']canonical["']/i.test(html), "Add a <link rel=canonical>.", "Prevents split authority.");
    add("TECHNICAL", "MEDIUM", "OpenGraph tags present", /property=["']og:title["']/i.test(html), "Add og:title, og:description.", "Controls how your brand appears when shared.");
    add("TECHNICAL", "HIGH", "HTTPS enabled", base.startsWith("https://"), "Serve the site over HTTPS.", "Non-HTTPS sites are down-ranked.");
    
    const imgs = (html.match(/<img[^>]*>/gi) || []).length;
    const alts = (html.match(/<img[^>]*alt=["'][^"']+["']/gi) || []).length;
    add("TECHNICAL", "LOW", "Images have alt text", imgs === 0 || alts / imgs >= 0.8, "Add descriptive alt text.", "Alt text is machine-readable context.");

    add("AI_READINESS", "CRITICAL", "Schema.org structured data (JSON-LD)", /<script[^>]+type=["']application\/ld\+json["']/i.test(html), "Add LocalBusiness + FAQPage JSON-LD.", "Structured data is the #1 way AI engines extract facts.");

    const robotsText = (await safeFetch(new URL("/robots.txt", base).toString())) || "";
    const aiBots = ["GPTBot", "ChatGPT-User", "Google-Extended", "Claude-Web", "PerplexityBot", "ClaudeBot"];
    const blockedBots = aiBots.filter((b) => new RegExp("user-agent:\\s*" + b + "[\\s\\S]{0,300}?disallow:\\s*/", "i").test(robotsText));
    add("AI_READINESS", "HIGH", "AI crawlers allowed in robots.txt", blockedBots.length === 0, "Remove Disallow rules for: " + (blockedBots.join(", ") || "AI bots"), "If blocked, ChatGPT/Perplexity cannot read your site.");

    add("AI_READINESS", "MEDIUM", "llms.txt present", (await safeFetch(new URL("/llms.txt", base).toString())) !== null, "Publish an llms.txt.", "Emerging standard for LLMs.");
    add("AI_READINESS", "HIGH", "FAQ content detected", /faqpage/i.test(html) || /\bfaq\b/i.test(html) || /<details[\s>]/i.test(html), "Add a real FAQ section.", "Q&A format is how AI engines extract answers.");
    add("AI_READINESS", "HIGH", "Contact info (NAP) detectable", /href=["']tel:/i.test(html) || /tel[:]/i.test(html), "Publish phone + address.", "NAP consistency drives local recommendations.");

    const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
    const words = textOnly.split(/\s+/).filter(Boolean).length;
    add("CONTENT", "MEDIUM", "Substantial content (500+ words)", words >= 500, "Expand core pages to 500+ words.", "Thin pages give AI engines nothing to cite.");

    const totalWeight = checks.reduce((s, c) => s + c.impact, 0);
    const passedWeight = checks.reduce((s, c) => s + (c.passed ? c.impact : 0), 0);
    const score = Math.round((passedWeight / totalWeight) * 100);

    await prisma.auditFinding.createMany({
      data: checks.map((c) => ({ auditId, category: c.category, severity: c.severity, title: c.title, description: c.description, recommendation: c.recommendation, passed: c.passed, impactPoints: c.impact })),
    });

    const failed = checks.filter((c) => !c.passed && ["CRITICAL", "HIGH", "MEDIUM"].includes(c.severity));
    if (failed.length > 0) {
      await prisma.recommendation.createMany({
        data: failed.map((f) => ({ businessId: audit.businessId, sourceType: "WEBSITE_AUDIT", sourceId: auditId, priority: f.severity === "MEDIUM" ? "MEDIUM" : "HIGH", title: f.title, description: f.recommendation, expectedImpact: f.impact, estimatedEffort: 30 })),
      });
    }

    await prisma.websiteAudit.update({ where: { id: auditId }, data: { status: "COMPLETED", completedAt: new Date(), score } });
  } catch (e: any) {
    await prisma.websiteAudit.update({ where: { id: auditId }, data: { status: "FAILED", error: String(e?.message || e), completedAt: new Date() } });
  }
}