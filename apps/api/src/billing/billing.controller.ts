import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { BillingService, PRICING_PLANS } from "./billing.service";

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("plans")
  getPlans() {
    return Object.values(PRICING_PLANS);
  }

  @Get("status")
  @UseGuards(AuthGuard)
  getStatus(@Req() req: any) {
    return this.billing.getStatus(req.user.id);
  }

  @Post("upgrade")
  @UseGuards(AuthGuard)
  upgrade(@Req() req: any, @Body() body: any) {
    return this.billing.upgradePlan(req.user.id, body?.tier ?? "STARTER");
  }
}
