import { Module } from "@nestjs/common";
import { AuthSpikeController } from "./auth-spike.controller";
import { AuthSpikeService } from "./auth-spike.service";

@Module({
  controllers: [AuthSpikeController],
  providers: [AuthSpikeService],
})
export class AuthSpikeModule {}
