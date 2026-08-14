import { Module } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { InboxModule } from "../inbox/inbox.module";

@Module({
  controllers: [PostsController],
  providers: [PostsService],
  imports: [InboxModule],
})
export class PostsModule {}