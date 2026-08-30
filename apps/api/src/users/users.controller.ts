import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { UsersService } from "./users.service";
import { BusinessService } from "../business/business.service";
import { Role } from "@brandos/database";

@Controller("users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly business: BusinessService
  ) {}

  @Get()
  async listMembers(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    return this.users.listMembers(biz.id);
  }

  @Get("all")
  async listAllUsers(@Req() req: any) {
    return this.users.listAllPlatformUsers();
  }

  @Post("invite")
  async inviteUser(
    @Req() req: any,
    @Body()
    body: {
      email?: string;
      phone?: string;
      name?: string;
      role?: Role;
    }
  ) {
    const biz = await this.business.get(req.user.id);
    return this.users.inviteUser(biz.id, req.user.id, body);
  }

  @Patch(":id/role")
  async updateRole(
    @Req() req: any,
    @Param("id") targetUserId: string,
    @Body() body: { role: Role }
  ) {
    const biz = await this.business.get(req.user.id);
    return this.users.updateRole(biz.id, req.user.id, targetUserId, body.role);
  }

  @Patch(":id/status")
  async updateStatus(
    @Req() req: any,
    @Param("id") targetUserId: string,
    @Body() body: { status: string }
  ) {
    const biz = await this.business.get(req.user.id);
    return this.users.updateUserStatus(biz.id, req.user.id, targetUserId, body.status);
  }

  @Delete(":id")
  async removeMember(
    @Req() req: any,
    @Param("id") targetUserId: string
  ) {
    const biz = await this.business.get(req.user.id);
    return this.users.removeMember(biz.id, req.user.id, targetUserId);
  }

  @Get(":id/sessions")
  async getSessions(
    @Req() req: any,
    @Param("id") targetUserId: string
  ) {
    return this.users.getUserSessions(targetUserId);
  }

  @Delete("sessions/:sessionId")
  async revokeSession(
    @Req() req: any,
    @Param("sessionId") sessionId: string
  ) {
    const biz = await this.business.get(req.user.id);
    return this.users.revokeSession(req.user.id, biz.id, sessionId);
  }
}
