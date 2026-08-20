import { Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
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

  @Get("list")
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.business.list(req.user.id);
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
}