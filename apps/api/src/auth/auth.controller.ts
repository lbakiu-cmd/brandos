import { All, Controller, Req, Res } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @All("*")
  async handle(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:4000";
    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "HEAD" ? undefined : request.body;
    const forwardedRequest = new Request(new URL(request.url, baseURL), {
      method,
      headers: fromNodeHeaders(request.headers),
      body:
        body === undefined
          ? undefined
          : typeof body === "string"
            ? body
            : JSON.stringify(body),
    });
    const response = await this.auth.auth.handler(forwardedRequest);
    const setCookies = response.headers.getSetCookie();

    response.headers.forEach((value, key) => {
      if (key !== "set-cookie") reply.header(key, value);
    });
    if (setCookies.length > 0) reply.header("set-cookie", setCookies);

    return reply.status(response.status).send(await response.text());
  }
}
