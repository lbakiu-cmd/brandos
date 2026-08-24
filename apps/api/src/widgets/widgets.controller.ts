import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { WidgetsService } from "./widgets.service";
import { BusinessService } from "../business/business.service";
import { WidgetType, WidgetCategory } from "@brandos/database";

@Controller("widgets")
export class WidgetsController {
  constructor(
    private readonly widgets: WidgetsService,
    private readonly business: BusinessService
  ) {}

  /**
   * Get all available widget templates from catalog
   */
  @Get("catalog")
  @UseGuards(AuthGuard)
  getCatalog() {
    return this.widgets.getCatalog();
  }

  /**
   * Get active dashboard widgets for the current business
   */
  @Get()
  @UseGuards(AuthGuard)
  async getWidgets(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    return this.widgets.getWidgets(biz.id);
  }

  /**
   * Add a widget to the dashboard
   */
  @Post()
  @UseGuards(AuthGuard)
  async addWidget(
    @Req() req: any,
    @Body()
    body: {
      widgetType: WidgetType;
      title?: string;
      category?: WidgetCategory;
      width?: number;
      config?: any;
    }
  ) {
    const biz = await this.business.get(req.user.id);
    return this.widgets.addWidget(biz.id, body);
  }

  /**
   * Reset to default widgets
   */
  @Post("reset-default")
  @UseGuards(AuthGuard)
  async resetDefault(@Req() req: any) {
    const biz = await this.business.get(req.user.id);
    await this.widgets.initDefaultWidgets(biz.id);
    return this.widgets.getWidgets(biz.id);
  }

  /**
   * Update widget configuration or layout
   */
  @Patch(":id")
  @UseGuards(AuthGuard)
  async updateWidget(
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      width?: number;
      position?: number;
      enabled?: boolean;
      config?: any;
    }
  ) {
    return this.widgets.updateWidget(id, body);
  }

  /**
   * Remove widget from dashboard
   */
  @Delete(":id")
  @UseGuards(AuthGuard)
  async deleteWidget(@Param("id") id: string) {
    return this.widgets.deleteWidget(id);
  }
}
