import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CompetitorsService } from "./competitors.service";

@Controller("competitors")
export class CompetitorsController {
  constructor(private readonly competitors: CompetitorsService) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.competitors.list(req.user.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.competitors.create(req.user.id, body);
  }

  @Post("benchmark")
  @UseGuards(AuthGuard)
  benchmark(@Req() req: any) {
    return this.competitors.benchmark(req.user.id);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  delete(@Param("id") id: string, @Req() req: any) {
    return this.competitors.delete(req.user.id, id);
  }
}
