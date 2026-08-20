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
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.reviews.list(req.user.id);
  }

  @Post(":id/generate-reply")
  @UseGuards(AuthGuard)
  generateReply(@Param("id") id: string, @Req() req: any) {
    return this.reviews.generateAiReply(req.user.id, id);
  }

  @Patch(":id/reply")
  @UseGuards(AuthGuard)
  updateReply(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any
  ) {
    return this.reviews.updateReply(req.user.id, id, String(body?.replyText ?? ""));
  }
}
