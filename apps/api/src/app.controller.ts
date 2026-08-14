import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "brandos-api",
      time: new Date().toISOString(),
    };
  }
}