import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { AuthenticatedUser } from "./auth-session.service";

export type AuthenticatedRequest = FastifyRequest & {
  authenticatedUser: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().authenticatedUser,
);
