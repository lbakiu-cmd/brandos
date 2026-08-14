import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ExceptionFilter, Catch, ArgumentsHost } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { AppModule } from "./app.module";

// Use require() for Fastify plugins (ESM interop safety)
// @ts-ignore
const fastifyCookie = require("@fastify/cookie");

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    console.error("\n🔥 UNHANDLED API ERROR:");
    console.error(exception);
    
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    
    // Send the FULL STACK TRACE to the HTTP response!
    response.status(500).send({
      statusCode: 500,
      message: exception instanceof Error ? exception.message : "Internal server error",
      stack: exception instanceof Error ? exception.stack : "No stack trace available",
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register the cookie plugin safely on the underlying Fastify instance
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyCookie, {
    secret: "brandos-super-secret-cookie-signing-key-2026",
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: ["http://localhost:3000"],
    credentials: true,
  });

  await app.listen(3001, "0.0.0.0");
  console.log("🚀 BrandOS API running on http://localhost:3001");
}

void bootstrap();