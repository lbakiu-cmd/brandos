import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Body,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { ActivityService } from "./activity.service";
import { BusinessService } from "../business/business.service";

@Controller("activity")
@UseGuards(AuthGuard)
export class ActivityController {
  constructor(
    private readonly activity: ActivityService,
    private readonly business: BusinessService
  ) {}

  @Get()
  async listLogs(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("action") action?: string,
    @Query("userId") userId?: string,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    let bizId: string | undefined;
    if (!req.user?.isSuperAdmin) {
      const biz = await this.business.get(req.user.id, req.user.activeBusinessId).catch(() => null);
      bizId = biz?.id;
    }

    return this.activity.list(bizId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      category,
      action,
      userId,
      search,
      startDate,
      endDate,
    });
  }

  @Get("stats")
  async getStats(@Req() req: any) {
    let bizId: string | undefined;
    if (!req.user?.isSuperAdmin) {
      const biz = await this.business.get(req.user.id, req.user.activeBusinessId).catch(() => null);
      bizId = biz?.id;
    }
    return this.activity.getStats(bizId);
  }

  @Post("export")
  async exportLogs(
    @Req() req: any,
    @Body() body: { format?: "json" | "csv" }
  ) {
    let bizId: string | undefined;
    if (!req.user?.isSuperAdmin) {
      const biz = await this.business.get(req.user.id, req.user.activeBusinessId).catch(() => null);
      bizId = biz?.id;
    }
    return this.activity.exportLogs(bizId, body?.format || "json");
  }
}
