export const brandosVersion = "0.1.0";

export type HealthStatus = {
  ok: true;
  service: string;
  version: string;
};

export const websiteCrawlQueueName = "brandos.website-crawls";
export const websiteCrawlJobName = "website-crawl.requested";

export type WebsiteCrawlJobData = {
  crawlId: string;
  websiteId: string;
};
