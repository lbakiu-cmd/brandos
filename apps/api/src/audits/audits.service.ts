import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { prisma } from "@brandos/database";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

@Injectable()
export class AuditsService {
  private queue = new Queue("audit", { connection: redisConnection() });

  async startAudit(userId: string, url: string) {
    try {
      new URL(url);
    } catch {
      throw new BadRequestException("Invalid URL.");
    }
    const membership = await prisma.membership.findFirst({ where: { userId } });
    if (!membership) throw new NotFoundException("No business found.");

    const audit = await prisma.websiteAudit.create({
      data: { businessId: membership.businessId, url, status: "QUEUED" },
    });

    await this.queue.add("audit", { auditId: audit.id }, { jobId: audit.id });
    return audit;
  }

  async list(userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    return prisma.websiteAudit.findMany({
      where: { businessId: { in: memberships.map((m) => m.businessId) } },
      orderBy: { createdAt: "desc" },
      include: { findings: true },
    });
  }

  async get(id: string) {
    return prisma.websiteAudit.findUnique({
      where: { id },
      include: { findings: true },
    });
  }

  async recommendations(userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    return prisma.recommendation.findMany({
      where: { businessId: { in: memberships.map((m) => m.businessId) }, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });
  }
}