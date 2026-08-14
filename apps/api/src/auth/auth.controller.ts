import "@fastify/cookie";
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthGuard, COOKIE_NAME } from "./auth.guard";
import { AuthService } from "./auth.service";
import { parseRegister, parseLogin, RegisterDto, LoginDto } from "./dto";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    // Explicitly typed variable to kill the TS2345 error
    const input: RegisterDto = parseRegister(body);
    const result = await this.auth.register(input);
    this.setSessionCookie(reply, result.token);
    return { user: result.user };
  }

  @Post("login")
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const input: LoginDto = parseLogin(body);
    const result = await this.auth.login(input.email, input.password);
    this.setSessionCookie(reply, result.token);
    return { user: result.user };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() request: FastifyRequest & { user?: unknown }) {
    return { user: request.user };
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  async logout(
    @Req() request: FastifyRequest & { session?: { id: string } },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.auth.logout(request.session!.id);
    (reply as any).clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  }

  private setSessionCookie(reply: FastifyReply, token: string) {
    (reply as any).setCookie(COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }
}