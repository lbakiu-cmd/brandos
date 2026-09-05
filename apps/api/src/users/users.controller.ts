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
  BadRequestException,
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
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
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
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.users.inviteUser(biz.id, req.user.id, body);
  }

  @Patch(":id/role")
  async updateRole(
    @Req() req: any,
    @Param("id") targetUserId: string,
    @Body() body: { role: Role }
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.users.updateRole(biz.id, req.user.id, targetUserId, body.role);
  }

  @Patch(":id/status")
  async updateStatus(
    @Req() req: any,
    @Param("id") targetUserId: string,
    @Body() body: { status: string }
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.users.updateUserStatus(biz.id, req.user.id, targetUserId, body.status);
  }

  @Delete(":id")
  async removeMember(
    @Req() req: any,
    @Param("id") targetUserId: string
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
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
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.users.revokeSession(req.user.id, biz.id, sessionId);
  }

  // --- Super Admin System Management Endpoints ---

  @Post("admin/reset-system")
  async resetSystem(
    @Req() req: any,
    @Body() body: { confirmation: string }
  ) {
    if (body.confirmation !== "CONFIRM_RESET_ALL_DATA") {
      throw new BadRequestException("Invalid confirmation phrase. Type CONFIRM_RESET_ALL_DATA to proceed.");
    }
    return this.users.resetEntireSystem(req.user.id);
  }

  @Delete("admin/users/:id")
  async deleteUserByAdmin(
    @Req() req: any,
    @Param("id") targetUserId: string
  ) {
    return this.users.deleteUserBySuperAdmin(req.user.id, targetUserId);
  }

  @Delete("admin/businesses/:id")
  async deleteBusinessByAdmin(
    @Req() req: any,
    @Param("id") targetBusinessId: string
  ) {
    return this.users.deleteBusinessBySuperAdmin(req.user.id, targetBusinessId);
  }

  @Post("admin/businesses/:id/reset-data")
  async resetBusinessDataByAdmin(
    @Req() req: any,
    @Param("id") targetBusinessId: string
  ) {
    return this.users.resetBusinessDataBySuperAdmin(req.user.id, targetBusinessId);
  }
}
