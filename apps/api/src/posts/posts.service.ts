import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { prisma } from "@brandos/database";
import { InboxService } from "../inbox/inbox.service";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

@Injectable()
export class PostsService {
  private queue = new Queue("publish", { connection: redisConnection() });

  constructor(private readonly inbox: InboxService) {}

  async createPost(
    userId: string,
    input: { caption: string; scheduledFor?: string },
  ) {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    if (!membership) throw new NotFoundException("No business found.");

    let accounts = await prisma.socialAccount.findMany({
      where: { businessId: membership.businessId, status: "ACTIVE" },
    });
    if (accounts.length === 0) {
      accounts = [await this.inbox.connectFakeInstagram(userId)];
    }

    const scheduledDate = input.scheduledFor ? new Date(input.scheduledFor) : null;
    const isScheduled =
      scheduledDate !== null && scheduledDate.getTime() > Date.now();

    const post = await prisma.post.create({
      data: {
        businessId: membership.businessId,
        authorId: userId,
        caption: input.caption,
        status: isScheduled ? "SCHEDULED" : "PUBLISHING",
        scheduledFor: scheduledDate,
        publications: {
          create: accounts.map((a) => ({
            socialAccountId: a.id,
            platform: a.platform,
            status: "PENDING",
          })),
        },
      },
      include: { publications: true },
    });

    for (const pub of post.publications) {
      const delay = isScheduled
        ? Math.max(0, scheduledDate!.getTime() - Date.now())
        : 0;
      // jobId = idempotencyKey -> BullMQ will never double-enqueue the same publish
      await this.queue.add(
        "publish",
        { publicationId: pub.id },
        { delay, jobId: pub.idempotencyKey },
      );
    }

    return post;
  }

  async listPosts(userId: string) {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    return prisma.post.findMany({
      where: { businessId: { in: memberships.map((m) => m.businessId) } },
      orderBy: { createdAt: "desc" },
      include: {
        publications: {
          include: {
            socialAccount: { select: { displayName: true, platform: true } },
          },
        },
      },
    });
  }
}