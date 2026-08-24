import { Module } from "@nestjs/common";
import { OAuthController } from "./oauth.controller";
import { GoogleOAuthService } from "./google-oauth.service";
import { MetaOAuthService } from "./meta-oauth.service";
import { BusinessService } from "../business/business.service";

@Module({
  controllers: [OAuthController],
  providers: [GoogleOAuthService, MetaOAuthService, BusinessService],
  exports: [GoogleOAuthService, MetaOAuthService],
})
export class OAuthModule {}
