import { Module } from "@nestjs/common";
import { WordpressController } from "./wordpress.controller";
import { WordpressService } from "./wordpress.service";
import { BusinessModule } from "../business/business.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [BusinessModule, AuthModule],
  controllers: [WordpressController],
  providers: [WordpressService],
  exports: [WordpressService],
})
export class WordpressModule {}
