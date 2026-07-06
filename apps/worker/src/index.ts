import { env } from "@brandos/config";
import {
  brandosVersion,
  type WebsiteCrawlJobData,
  websiteCrawlQueueName,
} from "@brandos/shared";
import { Worker } from "bullmq";

const worker = new Worker<WebsiteCrawlJobData>(
  websiteCrawlQueueName,
  async (job) => {
    console.log(
      `Received queued website crawl ${job.data.crawlId} for website ${job.data.websiteId}. External crawling is not implemented yet.`,
    );
  },
  {
    connection: redisConnectionFromUrl(env.redisUrl),
  },
);

worker.on("ready", () => {
  console.log(`BrandOS worker started (${brandosVersion})`);
});

worker.on("failed", (job, error) => {
  console.error(
    `Website crawl job ${job?.id ?? "unknown"} failed before crawling: ${error.message}`,
  );
});

function redisConnectionFromUrl(redisUrl: string) {
  const parsedUrl = new URL(redisUrl);

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username || undefined,
    password: parsedUrl.password || undefined,
  };
}
