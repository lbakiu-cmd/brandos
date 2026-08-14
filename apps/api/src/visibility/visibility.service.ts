import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { prisma } from "@brandos/database";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

@Injectable()
export class VisibilityService {
  private queue = new Queue("ai-visibility", { connection: redisConnection() });

  async start(userId: string) {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    if (!membership) throw new NotFoundException("No business found.");

    const report = await prisma.aiVisibilityReport.create({
      data: { businessId: membership.businessId },
    });

    await this.queue.add("ai-visibility", { reportId: report.id }, { jobId: report.id });
    return report;
  }

  async list(userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    return prisma.aiVisibilityReport.findMany({
      where: { businessId: { in: memberships.map((m) => m.businessId) } },
      orderBy: { createdAt: "desc" },
    });
  }
}