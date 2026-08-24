import { Module } from "@nestjs/common";
import { WidgetsController } from "./widgets.controller";
import { WidgetsService } from "./widgets.service";
import { BusinessModule } from "../business/business.module";
import { AuthModule } from "../auth/auth.module";
import { IntegrationsModule } from "../integrations/integrations.module";

@Module({
  imports: [BusinessModule, AuthModule, IntegrationsModule],
  controllers: [WidgetsController],
  providers: [WidgetsService],
  exports: [WidgetsService],
})
export class WidgetsModule {}
