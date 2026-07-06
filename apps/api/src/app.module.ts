import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { QueuesModule } from "./queues/queues.module";

@Module({
  imports: [DatabaseModule, QueuesModule, OrganizationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
