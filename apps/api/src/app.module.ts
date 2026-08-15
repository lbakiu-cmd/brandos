import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { InboxModule } from "./inbox/inbox.module";
import { PostsModule } from "./posts/posts.module";
import { AuditsModule } from "./audits/audits.module";
import { VisibilityModule } from "./visibility/visibility.module";
import { BusinessModule } from "./business/business.module";

@Module({
  controllers: [AppController],
  imports: [
    AuthModule,
    InboxModule,
    PostsModule,
    AuditsModule,
    VisibilityModule,
    BusinessModule,
  ],
})
export class AppModule {}