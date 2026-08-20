import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@brandos/database";
import { generateJsonLdSchema, generateLlmsTxt, generateRobotsTxtFix, generateFaqSchema, generateAeoSnippet } from "@brandos/audit-engine";

@Injectable()
export class CopilotService {
  async chat(userId: string, message: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: {
        business: {
          include: {
            websiteAudits: { orderBy: { createdAt: "desc" }, take: 1 },
            competitors: true,
            recommendations: { where: { status: "OPEN" }, take: 5 },
          },
        },
      },
    });

    if (!membership) throw new NotFoundException("Business workspace not found.");

    const biz = (membership as any).business;
    const latestAudit = biz.websiteAudits[0];
    const recs = biz.recommendations;
    const competitors = biz.competitors;

    const lower = message.toLowerCase();

    // 1. Schema or Structured Data request
    if (lower.includes("schema") || lower.includes("json-ld") || lower.includes("structured data")) {
      const fix = generateJsonLdSchema({
        name: biz.name,
        website: biz.website,
        city: biz.city,
        industry: biz.industry,
        phone: biz.phone,
        email: biz.email,
      });

      return {
        reply: `Here is the tailored Schema.org JSON-LD markup for **${biz.name}** (${biz.industry || "Local Business"} in ${biz.city || "your area"}).\n\n\`\`\`html\n${fix.code}\n\`\`\`\n\n### 💡 Instructions:\n${fix.instructions}`,
        suggestedActions: ["Generate FAQ Schema", "Create LLMs.txt", "Run Omnichannel Audit"],
      };
    }

    // 2. FAQ or AEO snippet request
    if (lower.includes("faq") || lower.includes("answer") || lower.includes("aeo")) {
      const faq = generateFaqSchema({
        name: biz.name,
        website: biz.website,
        city: biz.city,
        industry: biz.industry,
        phone: biz.phone,
      });

      const aeo = generateAeoSnippet({
        name: biz.name,
        website: biz.website,
        city: biz.city,
        industry: biz.industry,
        phone: biz.phone,
      });

      return {
        reply: `### 🎯 High-Impact FAQ & AEO Snippets for ${biz.name}\n\nHere is a 45-word direct answer block to capture Google AI Overviews and Perplexity:\n\n\`\`\`html\n${aeo.code}\n\`\`\`\n\nAnd here is the matching FAQPage Schema:\n\n\`\`\`html\n${faq.code}\n\`\`\``,
        suggestedActions: ["Generate Schema.org JSON-LD", "Generate Blog Article", "Check AI Visibility"],
      };
    }

    // 3. Competitor or Market Share question
    if (lower.includes("competitor") || lower.includes("sov") || lower.includes("rank") || lower.includes("beat")) {
      const compList = competitors.map((c: any) => c.name).join(", ") || "no competitors added yet";
      return {
        reply: `### 🥊 Competitor Strategy for ${biz.name}\n\n**Tracked Competitors**: ${compList}\n\nTo outrank local competitors in **${biz.city || "your city"}** across ChatGPT and Perplexity:\n1. **Publish an /llms.txt feed**: LLMs cite sites with clean machine manifests 3.2x more.\n2. **Increase Review Response Rate**: Target 85%+ on Google Maps with local city keywords in your replies.\n3. **Include Quantitative Stats**: Add specific numbers (e.g. *98% satisfaction, 10+ years experience, 1,500+ satisfied clients*) on your homepage.`,
        suggestedActions: ["Go to Competitor Studio", "Benchmark Live AI Share", "Draft Review Reply"],
      };
    }

    // 4. General Audit or Growth advice
    const openTasks = recs.map((r: any, i: number) => `${i + 1}. **${r.title}** (+${r.expectedImpact} pts)`).join("\n");

    return {
      reply: `### 🚀 BrandOS Strategic Diagnosis for ${biz.name}\n\n- **Industry**: ${biz.industry || "General Business"}\n- **Market**: ${biz.city || "Local Area"}\n- **Latest Audit Score**: ${latestAudit?.score ?? "Pending"} / 100\n\n**Top Recommended Priorities to Win Local AI Discovery**:\n${openTasks || "All primary recommendations are up to date! Great job."}\n\nAsk me anything! I can write articles, review replies, schemas, or diagnostic fixes on demand.`,
      suggestedActions: ["Generate Full Schema", "Create FAQ Block", "Draft Social Post", "Run Full Audit"],
    };
  }
}
