import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { VisibilityService } from "./visibility.service";

@Controller("ai-reports")
export class VisibilityController {
  constructor(private readonly visibility: VisibilityService) {}

  @Post()
  @UseGuards(AuthGuard)
  start(@Req() req: any) {
    return this.visibility.start(req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.visibility.list(req.user.id);
  }
}