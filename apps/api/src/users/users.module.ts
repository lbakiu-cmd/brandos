import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { BusinessModule } from "../business/business.module";
import { ActivityModule } from "../activity/activity.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [BusinessModule, ActivityModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
