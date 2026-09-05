import { Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { BusinessService } from "./business.service";

@Controller("business")
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Get()
  @UseGuards(AuthGuard)
  get(@Req() req: any) {
    return this.business.get(
      req.user.id,
      req.user.activeBusinessId || (req.headers["x-business-id"] as string)
    );
  }

  @Get("list")
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.business.list(req.user.id);
  }

  @Post("switch")
  @UseGuards(AuthGuard)
  switchWorkspace(@Req() req: any, @Body("businessId") businessId: string) {
    return this.business.switchBusiness(req.user.id, businessId);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.business.create(req.user.id, body);
  }

  @Patch()
  @UseGuards(AuthGuard)
  update(@Req() req: any, @Body() body: any) {
    return this.business.update(req.user.id, body);
  }

  // ---------------- Snapshot & 2-Week Comparison Endpoints ----------------

  @Get("snapshot/comparison")
  @UseGuards(AuthGuard)
  getComparison(@Req() req: any) {
    return this.business.getComparison(req.user.id);
  }

  @Post("snapshot/send-reminder-email")
  @UseGuards(AuthGuard)
  sendReminderEmail(@Req() req: any) {
    return this.business.sendReminderEmail(req.user.id);
  }

  @Post("snapshot/dismiss-reminder")
  @UseGuards(AuthGuard)
  dismissReminder(@Req() req: any) {
    return this.business.dismissReminder(req.user.id);
  }

  @Post("snapshot/checkpoint")
  @UseGuards(AuthGuard)
  saveCheckpoint(@Req() req: any, @Body() body: any) {
    return this.business.saveCheckpoint(req.user.id, body?.type);
  }
}