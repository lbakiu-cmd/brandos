import { Global, Module } from "@nestjs/common";
import { CrawlQueueService } from "./crawl-queue.service";

@Global()
@Module({
  providers: [CrawlQueueService],
  exports: [CrawlQueueService],
})
export class QueuesModule {}
