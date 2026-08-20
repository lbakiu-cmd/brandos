import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  Res,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { WordpressService } from "./wordpress.service";
import { BusinessService } from "../business/business.service";
import * as fs from "fs";

@Controller("wordpress")
export class WordpressController {
  constructor(
    private readonly wordpress: WordpressService,
    private readonly business: BusinessService
  ) {}

  /**
   * Get active connection details and API key for current user's business
   */
  @Get("connection")
  @UseGuards(AuthGuard)
  async getConnection(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    return this.wordpress.getConnection(biz.id);
  }

  /**
   * Rotate API Key for current user's business
   */
  @Post("rotate-key")
  @UseGuards(AuthGuard)
  async rotateKey(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    return this.wordpress.rotateApiKey(biz.id);
  }

  /**
   * Connect to a WordPress site from the dashboard
   */
  @Post("connect")
  @UseGuards(AuthGuard)
  async connectSite(@Req() req: any, @Body() body: { site_url: string }) {
    const biz = await this.business.get(req.user.id);
    return this.wordpress.connectFromDashboard(biz.id, body.site_url);
  }

  /**
   * Disconnect WordPress site
   */
  @Post("disconnect")
  @UseGuards(AuthGuard)
  async disconnectSite(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    return this.wordpress.disconnect(biz.id);
  }

  /**
   * Sync telemetry and content scores from WordPress
   */
  @Post("sync")
  @UseGuards(AuthGuard)
  async syncTelemetry(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    return this.wordpress.sync(biz.id);
  }

  /**
   * 1-Click Remote Fix Dispatcher: Send fix to WordPress
   */
  @Post("apply-fix")
  @UseGuards(AuthGuard)
  async applyFix(
    @Req() req: any,
    @Body() body: { fix_type: string; payload?: any }
  ) {
    const biz = await this.business.get(req.user.id);
    return this.wordpress.applyRemoteFix(biz.id, body);
  }

  /**
   * Copilot Auto-Publisher: Send post to WordPress
   */
  @Post("publish")
  @UseGuards(AuthGuard)
  async publishPost(
    @Req() req: any,
    @Body()
    body: {
      title: string;
      content: string;
      status?: "draft" | "publish" | "pending";
      meta_title?: string;
      meta_description?: string;
      focus_keyword?: string;
      schemas?: any[];
      categories?: number[];
      tags?: string[];
    }
  ) {
    const biz = await this.business.get(req.user.id);
    return this.wordpress.publishPost(biz.id, body);
  }

  /**
   * Handshake endpoint called from WordPress plugin during setup
   */
  @Post("verify")
  async verifyFromPlugin(
    @Headers("authorization") authHeader: string,
    @Body() body: { site_url: string; site_name?: string; plugin_version?: string }
  ) {
    return this.wordpress.verifyFromPlugin(authHeader, body);
  }

  /**
   * Download the latest AIVision SEO Plugin ZIP
   */
  @Get("plugin-download")
  downloadPlugin(@Res() res: any) {
    const zipPath = this.wordpress.getPluginZipPath();
    if (!fs.existsSync(zipPath)) {
      throw new NotFoundException("AIVision SEO plugin package not found.");
    }

    const fileBuffer = fs.readFileSync(zipPath);
    res.header("Content-Type", "application/zip");
    res.header(
      "Content-Disposition",
      'attachment; filename="aivision-seo-v1.4.1.zip"'
    );
    return res.send(fileBuffer);
  }
}
