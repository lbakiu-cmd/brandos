import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { MailModule } from "../mail/mail.module";
import { ActivityModule } from "../activity/activity.module";

@Module({
  imports: [MailModule, ActivityModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}