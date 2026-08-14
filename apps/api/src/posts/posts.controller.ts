import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PostsService } from "./posts.service";

@Controller("posts")
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req: any, @Body() body: any) {
    return this.posts.createPost(req.user.id, {
      caption: String(body?.caption ?? ""),
      scheduledFor: body?.scheduledFor || undefined,
    });
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.posts.listPosts(req.user.id);
  }
}