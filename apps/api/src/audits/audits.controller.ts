import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { AuditsService } from "./audits.service";

@Controller("audits")
export class AuditsController {
  constructor(private readonly audits: AuditsService) {}

  @Post("public-scan")
  publicScan(@Body() body: any) {
    return this.audits.publicScan(
      String(body?.url ?? ""),
      body?.businessName ? String(body.businessName) : undefined,
      body?.city ? String(body.city) : undefined
    );
  }

  @Post("bulk-scan")
  bulkScan(@Body() body: any) {
    const items = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.urls)
      ? body.urls.map((u: string) => ({ url: u }))
      : [];
    return this.audits.bulkScan(items);
  }

  @Post()
  @UseGuards(AuthGuard)
  start(@Req() req: any, @Body() body: any) {
    return this.audits.startAudit(req.user.id, String(body?.url ?? ""));
  }

  @Post("omnichannel")
  @UseGuards(AuthGuard)
  startOmni(@Req() req: any) {
    return this.audits.startOmniAudit(req.user.id);
  }

  @Get("overview")
  @UseGuards(AuthGuard)
  getOverview(@Req() req: any) {
    return this.audits.getOverview(req.user.id);
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

  @Patch("recommendations/:id")
  @UseGuards(AuthGuard)
  updateRecommendation(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any
  ) {
    return this.audits.updateRecommendationStatus(id, body?.status ?? "DONE", req.user.id);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  get(@Param("id") id: string, @Req() req: any) {
    return this.audits.get(id, req.user.id);
  }
}