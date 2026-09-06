import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { prisma } from "@brandos/database";
import { generateVisibilityReport } from "./visibility-report-generator";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

@Injectable()
export class VisibilityService {
  private queue = new Queue("ai-visibility", { connection: redisConnection() });

  async start(userId: string, targetQuery?: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership || !membership.business) {
      throw new NotFoundException("No business found.");
    }

    const biz = membership.business;
    const payload = generateVisibilityReport(
      {
        id: biz.id,
        name: biz.name,
        city: biz.city,
        country: biz.country,
        industry: biz.industry,
      },
      targetQuery
    );

    const googleScore = payload.engineStats.googleAi.percentage;
    const chatGptScore = payload.engineStats.chatGpt.percentage;
    const overallScore = Math.round((googleScore + chatGptScore) / 2);

    const report = await prisma.aiVisibilityReport.create({
      data: {
        businessId: membership.businessId,
        overallScore,
        engineScores: {
          GOOGLE_AI_OVERVIEW: googleScore,
          CHATGPT: chatGptScore,
        },
        mentions: payload as any,
        promptsRun: payload.questions.length * 2,
      },
    });

    try {
      await this.queue.add(
        "ai-visibility",
        { reportId: report.id, query: targetQuery },
        { jobId: report.id }
      );
    } catch {
      // Redis queue is optional if running synchronously
    }

    return report;
  }

  async list(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { business: true },
    });
    if (memberships.length === 0) return [];

    const reports = await prisma.aiVisibilityReport.findMany({
      where: { businessId: { in: memberships.map((m) => m.businessId) } },
      orderBy: { createdAt: "desc" },
    });

    // If no reports exist yet, auto-generate a baseline report for the first business
    if (reports.length === 0 && memberships[0]?.business) {
      const biz = memberships[0].business;
      const payload = generateVisibilityReport({
        id: biz.id,
        name: biz.name,
        city: biz.city,
        country: biz.country,
        industry: biz.industry,
      });

      const googleScore = payload.engineStats.googleAi.percentage;
      const chatGptScore = payload.engineStats.chatGpt.percentage;
      const overallScore = Math.round((googleScore + chatGptScore) / 2);

      const baseline = await prisma.aiVisibilityReport.create({
        data: {
          businessId: biz.id,
          overallScore,
          engineScores: {
            GOOGLE_AI_OVERVIEW: googleScore,
            CHATGPT: chatGptScore,
          },
          mentions: payload as any,
          promptsRun: payload.questions.length * 2,
        },
      });

      return [baseline];
    }

    return reports;
  }
}