import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { AuthModule } from "../auth/auth.module";
import { AuthSessionGuard } from "../auth/auth-session.guard";

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, AuthSessionGuard],
})
export class OrganizationsModule {}
