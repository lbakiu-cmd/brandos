import { Module } from "@nestjs/common";
import { VisibilityController } from "./visibility.controller";
import { VisibilityService } from "./visibility.service";

@Module({
  controllers: [VisibilityController],
  providers: [VisibilityService],
})
export class VisibilityModule {}