import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { InboxModule } from "./inbox/inbox.module";

@Module({
  controllers: [AppController],
  imports: [AuthModule, InboxModule],
})
export class AppModule {}