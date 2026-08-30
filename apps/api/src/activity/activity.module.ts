import { Module } from "@nestjs/common";
import { ActivityService } from "./activity.service";
import { ActivityController } from "./activity.controller";
import { BusinessModule } from "../business/business.module";

@Module({
  imports: [BusinessModule],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
