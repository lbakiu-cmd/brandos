import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { InboxService } from "./inbox.service";

@Controller()
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Post("webhooks/meta")
  metaWebhook(@Body() body: unknown) {
    return this.inbox.ingestMetaWebhook(body);
  }

  @Post("inbox/connect-fake-instagram")
  @UseGuards(AuthGuard)
  connectFake(@Req() req: any) {
    return this.inbox.connectFakeInstagram(req.user.id);
  }

  @Get("inbox")
  @UseGuards(AuthGuard)
  list(@Req() req: any) {
    return this.inbox.listConversations(req.user.id);
  }

  @Get("inbox/:id/messages")
  @UseGuards(AuthGuard)
  messages(@Param("id") id: string, @Req() req: any) {
    return this.inbox.listMessages(id, req.user.id);
  }

  @Post("inbox/:id/reply")
  @UseGuards(AuthGuard)
  reply(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.inbox.reply(id, String(body?.text ?? ""), req.user.id);
  }
}