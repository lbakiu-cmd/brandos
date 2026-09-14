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
  Query,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { WordpressService } from "./wordpress.service";
import { BusinessService } from "../business/business.service";
import * as fs from "fs";
import * as path from "path";

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
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.getConnection(biz.id);
  }

  /**
   * Rotate API Key for current user's business
   */
  @Post("rotate-key")
  @UseGuards(AuthGuard)
  async rotateKey(@Req() req: any) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.rotateApiKey(biz.id);
  }

  /**
   * Connect to a WordPress site from the dashboard
   */
  @Post("connect")
  @UseGuards(AuthGuard)
  async connectSite(@Req() req: any, @Body() body: { site_url: string }) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.connectFromDashboard(biz.id, body.site_url);
  }

  /**
   * Disconnect WordPress site
   */
  @Post("disconnect")
  @UseGuards(AuthGuard)
  async disconnectSite(@Req() req: any) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.disconnect(biz.id);
  }

  /**
   * Sync telemetry and content scores from WordPress
   */
  @Post("sync")
  @UseGuards(AuthGuard)
  async syncTelemetry(@Req() req: any) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
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
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.applyRemoteFix(biz.id, body);
  }

  /**
   * Automated 1-Click Platform Auto-Remediation:
   * Fixes all open audit issues on WordPress and marks recommendations DONE
   */
  @Post("auto-remediate")
  @UseGuards(AuthGuard)
  async autoRemediate(@Req() req: any) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.autoRemediate(biz.id);
  }

  /**
   * Get Autopilot Configuration for Business
   */
  @Get("autopilot-settings")
  @UseGuards(AuthGuard)
  async getAutopilotSettings(@Req() req: any) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.getAutopilotSettings(biz.id);
  }

  /**
   * Update Autopilot Configuration for Business
   */
  @Post("autopilot-settings")
  @UseGuards(AuthGuard)
  async updateAutopilotSettings(
    @Req() req: any,
    @Body()
    body: {
      enabled?: boolean;
      cadence?: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
      defaultStatus?: "draft" | "publish";
      selectedCategories?: string[];
    }
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.updateAutopilotSettings(biz.id, body);
  }

  /**
   * Autonomous Autopilot Execution:
   * Generates and publishes next scheduled blog article directly to WordPress
   */
  @Post("run-autopilot")
  @UseGuards(AuthGuard)
  async runAutopilot(@Req() req: any) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.runAutopilot(biz.id);
  }

  /**
   * Get Suggested & Live WordPress Categories for the Business
   */
  @Get("categories")
  @UseGuards(AuthGuard)
  async getCategories(@Req() req: any) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.getCategories(biz.id);
  }

  /**
   * AI Blog Article Generator tailored to selected business categories
   */
  @Post("generate-article")
  @UseGuards(AuthGuard)
  async generateArticle(
    @Req() req: any,
    @Body()
    body: {
      categories: string[];
      topic?: string;
      tone?: string;
      focusKeyword?: string;
    }
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.generateArticle(biz.id, body);
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
      categories?: (number | string)[];
      tags?: string[];
    }
  ) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
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

  @Post("sync-from-plugin")
  async syncFromPlugin(@Headers("authorization") authHeader: string) {
    return this.wordpress.syncFromPlugin(authHeader);
  }

  /**
   * Get version tracking history of AIVision SEO Plugin
   */
  @Get("plugin-versions")
  getPluginVersions() {
    return this.wordpress.getPluginVersions();
  }

  /**
   * Download the latest or specified AIVision SEO Plugin ZIP
   */
  @Get("plugin-download")
  downloadPlugin(@Res() res: any, @Query("version") version?: string) {
    const zipPath = this.wordpress.getPluginZipPath(version);
    if (!fs.existsSync(zipPath)) {
      throw new NotFoundException("AIVision SEO plugin package not found.");
    }

    const filename = path.basename(zipPath);
    const fileBuffer = fs.readFileSync(zipPath);
    res.header("Content-Type", "application/zip");
    res.header(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    return res.send(fileBuffer);
  }

  /**
   * Automatically push and install plugin update to all connected WordPress sites
   */
  @Post("push-update")
  @UseGuards(AuthGuard)
  async pushUpdate(@Req() req: any, @Body("version") version?: string) {
    const biz = await this.business.get(req.user.id, req.user.activeBusinessId);
    return this.wordpress.broadcastPluginUpdate(biz.id, version);
  }
}
