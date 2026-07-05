import { Injectable } from "@nestjs/common";
import { brandosVersion, type HealthStatus } from "@brandos/shared";

@Injectable()
export class AppService {
  health(): HealthStatus {
    return {
      ok: true,
      service: "brandos-api",
      version: brandosVersion,
    };
  }
}
