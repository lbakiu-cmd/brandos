import { Injectable, UnauthorizedException } from "@nestjs/common";
import { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { AuthService } from "./auth.service";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

@Injectable()
export class AuthSessionService {
  constructor(private readonly auth: AuthService) {}

  async requireUser(headers: IncomingHttpHeaders): Promise<AuthenticatedUser> {
    const session = await this.auth.auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });

    if (!session?.user) {
      throw new UnauthorizedException("Authentication required.");
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
  }
}
