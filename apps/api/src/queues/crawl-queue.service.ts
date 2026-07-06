import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { env } from "@brandos/config";
import {
  websiteCrawlJobName,
  type WebsiteCrawlJobData,
  websiteCrawlQueueName,
} from "@brandos/shared";
import { Queue } from "bullmq";

@Injectable()
export class CrawlQueueService implements OnModuleDestroy {
  private readonly queue = new Queue<WebsiteCrawlJobData>(
    websiteCrawlQueueName,
    {
      connection: redisConnectionFromUrl(env.redisUrl),
    },
  );

  async enqueueWebsiteCrawl(data: WebsiteCrawlJobData) {
    await this.queue.add(websiteCrawlJobName, data, {
      jobId: data.crawlId,
      removeOnComplete: 100,
      removeOnFail: 100,
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}

function redisConnectionFromUrl(redisUrl: string) {
  const parsedUrl = new URL(redisUrl);

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username || undefined,
    password: parsedUrl.password || undefined,
  };
}
