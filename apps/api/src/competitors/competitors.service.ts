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

  async benchmark(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");

    const biz = membership.business;
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

    const totalMentions = competitorStats.reduce((sum, c) => sum + c.rawWeight, 0);
    competitorStats.forEach((c) => {
      c.sovPercent = totalMentions > 0 ? Math.round((c.rawWeight / totalMentions) * 100) : 0;
    });

    return {
      prompt,
      engines,
      shareOfVoice: {
        yourBusiness: {
          name: biz.name,
          mentions: 0,
          sovPercent: totalMentions === 0 ? 100 : 0,
          authorityScore: 0,
        },
        competitors: competitorStats,
      },
      insights: competitors.length === 0
        ? ["Add competitors to monitor their presence across AI search engines."]
        : totalMentions === 0
        ? ["No AI mention probes recorded for competitors yet."]
        : [`Tracked ${competitors.length} competitors across AI search engines.`],
    };
  }
}
