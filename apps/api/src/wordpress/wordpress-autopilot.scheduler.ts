import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Queue } from "bullmq";
import { prisma } from "@brandos/database";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

/**
 * Fires the wordpress-autopilot BullMQ job (consumed by apps/worker) for every
 * connected business whose saved Autopilot schedule is enabled and due, so
 * "Save Autopilot Publishing Schedule" actually results in unattended
 * daily/weekly/monthly publishing instead of only firing on manual trigger.
 */
@Injectable()
export class WordpressAutopilotScheduler {
  private readonly logger = new Logger(WordpressAutopilotScheduler.name);
  private readonly autopilotQueue = new Queue("wordpress-autopilot", { connection: redisConnection() });

  @Cron(CronExpression.EVERY_HOUR)
  async dispatchDueAutopilotRuns() {
    const candidates = await prisma.business.findMany({
      where: {
        wordpressUrl: { not: null },
        wordpressApiKey: { not: null },
        wordpressTelemetry: {
          path: ["autopilot", "enabled"],
          equals: true,
        },
      },
      select: { id: true, name: true, wordpressTelemetry: true },
    });

    const now = Date.now();
    let dispatched = 0;

    for (const business of candidates) {
      const autopilot = (business.wordpressTelemetry as any)?.autopilot;
      const nextRunAt = autopilot?.nextRunAt ? new Date(autopilot.nextRunAt).getTime() : null;
      const isDue = nextRunAt === null || Number.isNaN(nextRunAt) || nextRunAt <= now;
      if (!isDue) continue;

      await this.autopilotQueue.add(
        "run",
        { businessId: business.id },
        { jobId: `autopilot-${business.id}-${new Date().toISOString().slice(0, 10)}`, removeOnComplete: true, removeOnFail: 50 }
      );
      dispatched++;
    }

    if (dispatched > 0) {
      this.logger.log(`Dispatched ${dispatched} due WordPress Autopilot run(s) of ${candidates.length} enabled business(es).`);
    }
  }
}
