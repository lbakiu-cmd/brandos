import dotenv from "dotenv";
import path from "node:path";
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
import "reflect-metadata";
import * as dns from "node:dns";
// Ensure outbound requests use whitelisted VPS IPv4 address
dns.setDefaultResultOrder("ipv4first");

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { AppModule } from "./app.module";

// Use require() for Fastify plugins (ESM interop safety)
// @ts-ignore
const fastifyCookie = require("@fastify/cookie");

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isDev = process.env.NODE_ENV !== "production";

    if (!isHttp) {
      console.error("\n🔥 UNHANDLED API ERROR:", exception);
    }

    const resBody = isHttp ? exception.getResponse() : null;
    const message =
      typeof resBody === "object" && resBody !== null && "message" in resBody
        ? (resBody as any).message
        : exception instanceof Error
          ? exception.message
          : "Internal server error";

    response.status(status).send({
      statusCode: status,
      message,
      ...(isDev && !isHttp && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { rawBody: true },
  );

  // Register the cookie plugin safely on the underlying Fastify instance
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyCookie, {
    secret: "brandos-super-secret-cookie-signing-key-2026",
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "https://onlinepresence.space",
      "https://www.onlinepresence.space",
      "https://brandoseye.com",
      "https://www.brandoseye.com",
      "https://icandothat.online",
      "https://www.icandothat.online",
    ],
    credentials: true,
  });

  await app.listen(3001, "0.0.0.0");
  console.log("🚀 BrandOS API running on http://localhost:3001");
}

void bootstrap();