import { Module } from "@nestjs/common";
import { LocalSeoToolsController } from "./local-seo-tools.controller";
import { LocalSeoToolsService } from "./local-seo-tools.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [LocalSeoToolsController],
  providers: [LocalSeoToolsService],
  exports: [LocalSeoToolsService],
})
export class LocalSeoToolsModule {}
