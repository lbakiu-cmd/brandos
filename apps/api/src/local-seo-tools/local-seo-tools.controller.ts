import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { LocalSeoToolsService } from "./local-seo-tools.service";

@Controller("local-seo-tools")
export class LocalSeoToolsController {
  constructor(private readonly tools: LocalSeoToolsService) {}

  @Post("categories")
  @UseGuards(AuthGuard)
  findCategories(@Req() req: any, @Body("industry") industry?: string) {
    return this.tools.findCategories(req.user.id, industry);
  }

  @Post("post")
  @UseGuards(AuthGuard)
  generatePost(
    @Req() req: any,
    @Body() body: { postType?: string; topic?: string; tone?: string }
  ) {
    return this.tools.generatePost(req.user.id, body);
  }

  @Post("qa")
  @UseGuards(AuthGuard)
  generateQa(@Req() req: any, @Body("serviceFocus") serviceFocus?: string) {
    return this.tools.generateQa(req.user.id, serviceFocus);
  }

  @Post("description")
  @UseGuards(AuthGuard)
  generateDescription(@Req() req: any, @Body("keywords") keywords?: string) {
    return this.tools.generateDescription(req.user.id, keywords);
  }

  @Post("services")
  @UseGuards(AuthGuard)
  findServices(@Req() req: any, @Body("category") category?: string) {
    return this.tools.findServices(req.user.id, category);
  }
}
