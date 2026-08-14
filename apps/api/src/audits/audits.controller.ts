import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { AuditsService } from "./audits.service";

@Controller("audits")
export class AuditsController {
  constructor(private readonly audits: AuditsService) {}

  @Post()
  @UseGuards(AuthGuard)
  start(@Req() req: any, @Body() body: any) {
    return this.audits.startAudit(req.user.id, String(body?.url ?? ""));
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.audits.list(req.user.id);
  }

  @Get("recommendations")
  @UseGuards(AuthGuard)
  recommendations(@Req() req: any) {
    return this.audits.recommendations(req.user.id);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  get(@Param("id") id: string) {
    return this.audits.get(id);
  }
}