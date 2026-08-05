import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { QueuesModule } from "./queues/queues.module";
import { AuthSpikeModule } from "./auth-spike/auth-spike.module";

@Module({
  imports: [DatabaseModule, QueuesModule, OrganizationsModule, AuthSpikeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
