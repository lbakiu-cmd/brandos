import "@fastify/cookie";
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Query,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthGuard, COOKIE_NAME } from "./auth.guard";
import { AuthService } from "./auth.service";
import {
  parseRegister,
  parseLogin,
  parseVerify2faSetup,
  parseVerify2faLogin,
  parseGoogleVerify,
  RegisterDto,
  LoginDto,
} from "./dto";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function extractReqMeta(req: FastifyRequest) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    (req.raw.socket as any)?.remoteAddress ||
    "127.0.0.1";
  const userAgent = (req.headers["user-agent"] as string) || "Unknown Device";
  return { ip, userAgent };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body() body: unknown,
    @Req() req: FastifyRequest
  ) {
    const input: RegisterDto = parseRegister(body);
    const meta = extractReqMeta(req);
    const result = await this.auth.register(input, meta);
    return result;
  }

  @Post("login")
  async login(
    @Body() body: unknown,
    @Req() req: FastifyRequest
  ) {
    const input: LoginDto = parseLogin(body);
    const meta = extractReqMeta(req);
    const result = await this.auth.login(input.email, input.password, meta);
    return result;
  }

  @Post("2fa/verify-setup")
  async verify2faSetup(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const input = parseVerify2faSetup(body);
    const meta = extractReqMeta(req);
    const result = await this.auth.verify2faSetup(input, meta);
    this.setSessionCookie(reply, result.token);
    return {
      user: result.user,
      backupCodes: result.backupCodes,
      message: result.message,
    };
  }

  @Post("2fa/verify-login")
  async verify2faLogin(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const input = parseVerify2faLogin(body);
    const meta = extractReqMeta(req);
    const result = await this.auth.verify2faLogin(input, meta);
    this.setSessionCookie(reply, result.token);
    return { user: result.user };
  }

  @Post("google/verify")
  async verifyGoogleToken(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const input = parseGoogleVerify(body);
    const meta = extractReqMeta(req);
    const result = await this.auth.loginWithGoogle(input, meta);
    if ((result as any).token) {
      this.setSessionCookie(reply, (result as any).token);
    }
    return result;
  }

  @Get("google/url")
  getGoogleAuthUrl(@Query("returnUrl") returnUrl?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const redirectUri =
      process.env.GOOGLE_AUTH_REDIRECT_URI ||
      process.env.GOOGLE_REDIRECT_URI ||
      "https://brandoseye.com/api/oauth/google/callback";

    const scopes = ["openid", "email", "profile"].join(" ");
    const stateObj = { auth: true, ret: returnUrl || "/dashboard", t: Date.now() };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "select_account",
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      clientId,
    };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() request: FastifyRequest & { user?: unknown }) {
    return { user: request.user };
  }

  @Post("profile")
  @UseGuards(AuthGuard)
  async updateProfile(
    @Req() request: FastifyRequest & { user: { id: string } },
    @Body() body: { name?: string; email?: string; phone?: string }
  ) {
    const meta = extractReqMeta(request);
    const user = await this.auth.updateProfile(request.user.id, body, meta);
    return { user };
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  async changePassword(
    @Req() request: FastifyRequest & { user: { id: string } },
    @Body() body: { currentPassword?: string; newPassword?: string }
  ) {
    const meta = extractReqMeta(request);
    return this.auth.changePassword(
      request.user.id,
      body.currentPassword || "",
      body.newPassword || "",
      meta
    );
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  async logout(
    @Req() request: FastifyRequest & { session?: { id: string }; user?: { id: string } },
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const meta = extractReqMeta(request);
    await this.auth.logout(request.session?.id || "", request.user?.id, meta);
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