import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CopilotService } from "./copilot.service";

@Controller("copilot")
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Post("chat")
  @UseGuards(AuthGuard)
  chat(@Req() req: any, @Body() body: any) {
    return this.copilot.chat(req.user.id, String(body?.message ?? ""));
  }
}
