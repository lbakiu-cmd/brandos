import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, AiEngine } from "@brandos/database";

@Injectable()
export class CompetitorsService {
  async list(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");

    const competitors = await prisma.competitor.findMany({
      where: { businessId: membership.businessId },
      include: {
        mentions: {
          orderBy: { capturedAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      business: membership.business,
      competitors,
    };
  }

  async create(userId: string, data: { name: string; website?: string }) {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException("Competitor name is required.");
    }
    const membership = await prisma.membership.findFirst({
      where: { userId },
    });
    if (!membership) throw new NotFoundException("No business found.");

    const count = await prisma.competitor.count({
      where: { businessId: membership.businessId },
    });
    if (count >= 10) {
      throw new BadRequestException("Maximum of 10 competitors allowed per business.");
    }

    return prisma.competitor.create({
      data: {
        businessId: membership.businessId,
        name: data.name.trim(),
        website: data.website?.trim() || null,
      },
    });
  }

  async delete(userId: string, id: string) {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    if (!membership) throw new NotFoundException("No business found.");

    const competitor = await prisma.competitor.findFirst({
      where: { id, businessId: membership.businessId },
    });
    if (!competitor) throw new NotFoundException("Competitor not found.");

    return prisma.competitor.delete({ where: { id } });
  }

  /**
   * Asks real AI engines (via OpenRouter) for the top local businesses in the
   * niche/city and records whether each competitor -- and the user's own
   * business -- appears in the answer.
   */
  private async runProbe(biz: any) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new BadRequestException("OPENROUTER_API_KEY is not configured on the server.");

    const list = await prisma.competitor.findMany({ where: { businessId: biz.id } });
    const prompt = `Top rated ${biz.industry || "services"} in ${biz.city || "your area"}`;
    const question = `${prompt}. List the top 10 businesses as a numbered list of names only.`;
    const models: Array<{ engine: AiEngine; id: string }> = [
      { engine: "GEMINI", id: "google/gemini-2.5-flash" },
      { engine: "CHATGPT", id: "openai/gpt-4o-mini" },
    ];
    const host = (u?: string | null) => (u || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
    let yourMentions = 0;
    let anyAnswer = false;

    for (const m of models) {
      let answer = "";
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "HTTP-Referer": process.env.FRONTEND_URL || "https://icandothat.online", "X-Title": "AIVisibility SEO" },
          body: JSON.stringify({ model: m.id, messages: [{ role: "user", content: question }], max_tokens: 500 }),
          signal: AbortSignal.timeout(45000),
        });
        if (res.ok) answer = ((await res.json()) as any)?.choices?.[0]?.message?.content || "";
      } catch {}
      if (!answer) continue;
      anyAnswer = true;
      const lower = answer.toLowerCase();
      const has = (name: string, site?: string | null) => (name && lower.includes(name.toLowerCase())) || (!!host(site) && lower.includes(host(site)));
      if (has(biz.name, biz.website)) yourMentions++;
      for (const c of list) {
        await prisma.competitorMention.create({
          data: { competitorId: c.id, engine: m.engine, prompt, mentioned: has(c.name, c.website) },
        });
      }
    }
    if (!anyAnswer) throw new BadRequestException("No AI engine responded. Please try again in a moment.");
    await prisma.activityLog.create({
      data: { businessId: biz.id, action: "COMPETITOR_PROBE", category: "AUDITS", description: "Competitor head-to-head probe", metadata: { yourMentions } },
    }).catch(() => {});
  }

  async benchmark(userId: string, probe = false) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");

    const biz = membership.business;
    if (probe) await this.runProbe(biz);
    const lastProbe = await prisma.activityLog.findFirst({
      where: { businessId: biz.id, action: "COMPETITOR_PROBE" },
      orderBy: { createdAt: "desc" },
    });
    const yourMentions = Number((lastProbe?.metadata as any)?.yourMentions || 0);
    const competitors = await prisma.competitor.findMany({
      where: { businessId: biz.id },
      include: {
        mentions: {
          orderBy: { capturedAt: "desc" },
          take: 20,
        },
      },
    });

    const engines: AiEngine[] = ["CHATGPT", "GEMINI"];
    const prompt = `Top rated ${biz.industry || "services"} in ${biz.city || "your area"}`;

    const competitorStats = competitors.map((comp) => {
      const mentionsCount = comp.mentions.filter((m) => m.mentioned).length;
      return {
        id: comp.id,
        name: comp.name,
        website: comp.website,
        rawWeight: mentionsCount,
        sovPercent: 0,
        engineBreakdown: {
          chatgpt: comp.mentions.filter((m) => m.engine === "CHATGPT" && m.mentioned).length,
          gemini: comp.mentions.filter((m) => m.engine === "GEMINI" && m.mentioned).length,
        },
      };
    });

    const compMentions = competitorStats.reduce((sum, c) => sum + c.rawWeight, 0);
    const totalMentions = compMentions + yourMentions;
    competitorStats.forEach((c) => {
      c.sovPercent = totalMentions > 0 ? Math.round((c.rawWeight / totalMentions) * 100) : 0;
    });

    return {
      prompt,
      engines,
      shareOfVoice: {
        yourBusiness: {
          name: biz.name,
          mentions: yourMentions,
          sovPercent: totalMentions === 0 ? 0 : Math.round((yourMentions / totalMentions) * 100),
          authorityScore: 0,
        },
        competitors: competitorStats,
      },
      insights: competitors.length === 0
        ? ["Add competitors to monitor their presence across AI search engines."]
        : totalMentions === 0
        ? ["No AI probes recorded yet -- click Run Head-to-Head Test."]
        : [`Tracked ${competitors.length} competitors across AI search engines.`],
    };
  }
}
