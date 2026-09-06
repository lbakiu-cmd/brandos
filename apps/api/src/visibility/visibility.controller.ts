import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { VisibilityService } from "./visibility.service";

@Controller("ai-reports")
export class VisibilityController {
  constructor(private readonly visibility: VisibilityService) {}

  @Post()
  @UseGuards(AuthGuard)
  start(@Req() req: any, @Body("query") query?: string) {
    return this.visibility.start(req.user.id, query);
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.visibility.list(req.user.id);
  }

  @Post("live-check")
  @UseGuards(AuthGuard)
  liveCheck(
    @Req() req: any,
    @Body()
    body?: {
      businessName?: string;
      city?: string;
      industry?: string;
      customPrompt?: string;
    }
  ) {
    return this.visibility.liveAuditMentions(req.user.id, body);
  }
}