import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { IntegrationsService, ConnectPayload } from "./integrations.service";
import { BusinessService } from "../business/business.service";
import { IntegrationProvider } from "@brandos/database";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly business: BusinessService
  ) {}

  /**
   * Get all connected platforms & available channels
   */
  @Get("status")
  @UseGuards(AuthGuard)
  async getStatus(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    return this.integrations.getStatus(biz.id);
  }

  /**
   * Connect platform via OAuth or 1-Click Simulated Link
   */
  @Post("connect/:provider")
  @UseGuards(AuthGuard)
  async connect(
    @Req() req: any,
    @Param("provider") provider: string,
    @Body() body: ConnectPayload
  ) {
    const validProvider = provider.toUpperCase() as IntegrationProvider;
    if (!Object.values(IntegrationProvider).includes(validProvider)) {
      throw new BadRequestException(`Invalid integration provider: ${provider}`);
    }

    const biz = await this.business.get(req.user.id);
    return this.integrations.connect(biz.id, validProvider, body);
  }

  /**
   * Disconnect integration
   */
  @Post("disconnect/:provider")
  @UseGuards(AuthGuard)
  async disconnect(@Req() req: any, @Param("provider") provider: string) {
    const validProvider = provider.toUpperCase() as IntegrationProvider;
    const biz = await this.business.get(req.user.id);
    return this.integrations.disconnect(biz.id, validProvider);
  }

  /**
   * Sync telemetry & fresh metrics
   */
  @Post("sync/:provider")
  @UseGuards(AuthGuard)
  async sync(@Req() req: any, @Param("provider") provider: string) {
    const validProvider = provider.toUpperCase() as IntegrationProvider;
    const biz = await this.business.get(req.user.id);
    return this.integrations.sync(biz.id, validProvider);
  }
}
