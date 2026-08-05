import { All, Controller, Req, Res } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { AuthSpikeService } from "./auth-spike.service";

@Controller("api/auth")
export class AuthSpikeController {
  constructor(private readonly authSpike: AuthSpikeService) {}

  @All("*")
  async handle(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:4000";
    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "HEAD" ? undefined : request.body;
    const authRequest = new Request(new URL(request.url, baseURL), {
      method,
      headers: fromNodeHeaders(request.headers),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const response = await this.authSpike.auth.handler(authRequest);
    const setCookies = response.headers.getSetCookie();

    response.headers.forEach((value, key) => {
      if (key !== "set-cookie") reply.header(key, value);
    });
    if (setCookies.length > 0) reply.header("set-cookie", setCookies);

    return reply.status(response.status).send(await response.text());
  }
}
