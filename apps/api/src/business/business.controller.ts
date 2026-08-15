import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { BusinessService } from "./business.service";

@Controller("business")
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Get()
  @UseGuards(AuthGuard)
  get(@Req() req: any) {
    return this.business.get(req.user.id);
  }

  @Patch()
  @UseGuards(AuthGuard)
  update(@Req() req: any, @Body() body: any) {
    return this.business.update(req.user.id, body);
  }
}