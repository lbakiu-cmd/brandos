import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { BusinessModule } from "../business/business.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [BusinessModule, AuthModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
