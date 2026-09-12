import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { BillingService, PRICING_PLANS } from "./billing.service";

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("plans")
  getPlans() {
    return Object.values(PRICING_PLANS);
  }

  @Get("status")
  @UseGuards(AuthGuard)
  getStatus(@Req() req: any) {
    return this.billing.getStatus(req.user.id);
  }

  /**
   * Superadmin override for manual plan adjustments (restricted)
   */
  @Post("upgrade")
  @UseGuards(AuthGuard)
  upgrade(@Req() req: any, @Body() body: any) {
    if (!req.user?.isSuperAdmin) {
      throw new ForbiddenException("Direct tier upgrades are restricted. Please upgrade via Stripe Checkout.");
    }
    return this.billing.upgradePlan(req.user.id, body?.tier ?? "STARTER");
  }

  /**
   * Stripe Hosted Checkout Session endpoint
   * Creates a hosted Stripe checkout session bound to the authenticated user's business.
   */
  @Post("create-checkout-session")
  @UseGuards(AuthGuard)
  async createCheckoutSession(@Req() req: any, @Res() res: any, @Body() body: any) {
    const session = await this.billing.createCheckoutSession(req.user.id, body);
    if (body?.redirect === false || req.headers["accept"]?.includes("application/json")) {
      return res.status(200).send(session);
    }
    return res.status(303).redirect(session.url);
  }

  /**
   * Self-Service Stripe Customer Portal endpoint
   * Redirects authenticated subscribers to manage their cards, invoices, or subscriptions.
   */
  @Post("create-portal-session")
  @UseGuards(AuthGuard)
  async createPortalSession(@Req() req: any) {
    return this.billing.createPortalSession(req.user.id);
  }

  /**
   * Stripe Webhook listener
   * Verifies Stripe signature with raw request buffer from Fastify.
   */
  @Post("webhook")
  async webhook(@Req() req: any, @Res() res: any, @Body() body: any) {
    const signature = req.headers["stripe-signature"] as string | undefined;
    const rawPayload = req.rawBody || body;
    const result = await this.billing.handleWebhook(rawPayload, signature);
    return res.status(200).send(result);
  }
}
