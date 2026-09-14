import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, SubscriptionTier } from "@brandos/database";
import Stripe from "stripe";

const COMMON_FEATURES = [
  "4-Pillar AI & Local SEO Presence Scanner",
  "Multi-Engine LLM Citation Monitoring (ChatGPT, Perplexity, Gemini, Claude)",
  "Google Search Console & GA4 AI Traffic Analytics",
  "Google Business Profile & Automated AI Review Responder",
  "1-Click Code Generation (JSON-LD Schema, /llms.txt, WordPress sync)",
  "Multi-Channel Content Studio & Scheduled Auto-Publishing",
  "Unified Customer Inbox (Instagram, Messenger)",
  "Executive White-Label PDF Client Reports",
  "Instant Discovery Alerts & Recommendations",
];

export const PRICING_PLANS = {
  FREE: {
    id: "FREE",
    name: "Free Discovery",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "Essential AI scan & baseline audit for single business owners.",
    features: [
      "1 Business Profile",
      "Public AI Visibility & Search Engine Scan",
      "Basic SEO & Schema Health",
      "3 Dashboard Widgets",
      "Community Support",
    ],
    limits: {
      businesses: 1,
      auditsPerMonth: 3,
      competitors: 1,
      widgetsLimit: 5,
      monitoredChannels: 2,
    },
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceMonthly: 25,
    priceAnnual: 240,
    description: "Single workspace/business with free website and business email. Full platform access.",
    features: [
      "1 Business Workspace",
      "Free Professional Website & Business Email",
      ...COMMON_FEATURES,
    ],
    limits: {
      businesses: 1,
      auditsPerMonth: 1000,
      competitors: 50,
      widgetsLimit: 50,
      monitoredChannels: 15,
    },
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 45,
    priceAnnual: 430,
    description: "Up to 10 businesses with full AI & SEO suite.",
    features: [
      "Up to 10 Business Workspaces",
      ...COMMON_FEATURES,
    ],
    limits: {
      businesses: 10,
      auditsPerMonth: 5000,
      competitors: 150,
      widgetsLimit: 150,
      monitoredChannels: 50,
    },
  },
  GROWTH: {
    id: "GROWTH",
    name: "Pro",
    priceMonthly: 45,
    priceAnnual: 430,
    description: "Up to 10 businesses with full AI & SEO suite.",
    features: [
      "Up to 10 Business Workspaces",
      ...COMMON_FEATURES,
    ],
    limits: {
      businesses: 10,
      auditsPerMonth: 5000,
      competitors: 150,
      widgetsLimit: 150,
      monitoredChannels: 50,
    },
  },
  AGENCY: {
    id: "AGENCY",
    name: "Agency",
    priceMonthly: 220,
    priceAnnual: 2100,
    description: "Up to 50 businesses with full AI & SEO suite.",
    features: [
      "Up to 50 Business Workspaces",
      ...COMMON_FEATURES,
    ],
    limits: {
      businesses: 50,
      auditsPerMonth: 25000,
      competitors: 500,
      widgetsLimit: 500,
      monitoredChannels: 200,
    },
  },
};

@Injectable()
export class BillingService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  }

  async getStatus(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership) throw new NotFoundException("No business found.");

    const biz = membership.business;
    const tier = (biz.subscriptionTier as SubscriptionTier) || "FREE";
    const plan = PRICING_PLANS[tier] || PRICING_PLANS.FREE;

    return {
      tier,
      status: biz.subscriptionStatus || "active",
      currentPeriodEnd: biz.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      hasStripeCustomer: !!biz.stripeCustomerId,
      plan,
      allPlans: [PRICING_PLANS.STARTER, PRICING_PLANS.PRO, PRICING_PLANS.AGENCY],
    };
  }

  async upgradePlan(userId: string, targetTier: SubscriptionTier) {
    if (!PRICING_PLANS[targetTier]) {
      throw new BadRequestException("Invalid subscription tier.");
    }

    const membership = await prisma.membership.findFirst({
      where: { userId },
    });
    if (!membership) throw new NotFoundException("No business found.");

    const updated = await prisma.business.update({
      where: { id: membership.businessId },
      data: {
        subscriptionTier: targetTier,
        subscriptionStatus: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      message: `Successfully updated plan to ${targetTier}.`,
      businessId: updated.id,
      tier: updated.subscriptionTier,
      plan: PRICING_PLANS[targetTier],
    };
  }

  /**
   * Stripe Hosted Checkout Session creation
   * Securely binds session to user & active business profile.
   */
  async createCheckoutSession(
    userId: string,
    options?: {
      tier?: string;
      cycle?: "monthly" | "annual";
      mode?: "subscription" | "payment";
      success_url?: string;
      cancel_url?: string;
      priceId?: string;
    },
  ) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true, user: true },
    });
    if (!membership?.business) {
      throw new NotFoundException("No active business found for this account. Please create or join a business first.");
    }

    const business = membership.business;
    const domain = process.env.FRONTEND_URL || process.env.DOMAIN || "https://icandothat.online";

    const mode = options?.mode || "subscription";
    const tier = (options?.tier || "STARTER").toUpperCase();
    const cycle = options?.cycle || "monthly";

    const resolvedPriceId =
      options?.priceId ||
      (cycle === "annual" ? process.env[`STRIPE_PRICE_${tier}_ANNUAL`] : process.env[`STRIPE_PRICE_${tier}`]) ||
      process.env[`STRIPE_PRICE_${tier}`] ||
      process.env.STRIPE_PRICE_ID;

    if (!resolvedPriceId) {
      throw new BadRequestException(`No Stripe price configured for tier ${tier} (${cycle}).`);
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: "hosted_page",
      mode,
      billing_address_collection: "auto",
      phone_number_collection: {
        enabled: false,
      },
      automatic_tax: {
        enabled: false,
      },
      allow_promotion_codes: true,
      submit_type: "auto",
      integration_identifier: "hosted_web_0001",
      origin_context: "web",
      success_url:
        options?.success_url ||
        `${domain}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: options?.cancel_url || `${domain}/dashboard/billing?canceled=true`,
      line_items: [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ],
      client_reference_id: business.id,
      metadata: {
        businessId: business.id,
        userId,
        tier,
        cycle,
      },
    };

    if (mode === "subscription") {
      sessionParams.payment_method_collection = "always";
      sessionParams.subscription_data = {
        metadata: {
          businessId: business.id,
          userId,
          tier,
          cycle,
        },
      };
    }

    if (business.stripeCustomerId) {
      sessionParams.customer = business.stripeCustomerId;
    } else if (membership.user?.email) {
      sessionParams.customer_email = membership.user.email;
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Creates a self-service Stripe Customer Billing Portal session
   * Allows subscribers to manage payment methods, download VAT receipts, and cancel subscriptions.
   */
  async createPortalSession(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership?.business) {
      throw new NotFoundException("No active business found for this account.");
    }

    const business = membership.business;
    if (!business.stripeCustomerId) {
      throw new BadRequestException(
        "No billing history or active Stripe customer found. Please subscribe to a plan first.",
      );
    }

    const domain = process.env.FRONTEND_URL || process.env.DOMAIN || "https://icandothat.online";

    const portalSession = await this.stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: `${domain}/dashboard/billing`,
    });

    return { url: portalSession.url };
  }

  /**
   * Webhook handler for Stripe billing and checkout events
   * Accepts raw Buffer or string for cryptographic HMAC verification
   */
  async handleWebhook(rawPayload: string | Buffer | any, signature?: string) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    if (endpointSecret && signature && !endpointSecret.startsWith("whsec_...")) {
      try {
        const payload =
          Buffer.isBuffer(rawPayload) || typeof rawPayload === "string"
            ? rawPayload
            : JSON.stringify(rawPayload);
        event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
      } catch (err: any) {
        console.error("Stripe webhook signature verification failed:", err.message);
        throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
      }
    } else {
      event =
        typeof rawPayload === "string" || Buffer.isBuffer(rawPayload)
          ? JSON.parse(rawPayload.toString())
          : rawPayload;
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Stripe event ${event.type}:`, session.id);

        const businessId = session.client_reference_id || session.metadata?.businessId;
        const tier = (session.metadata?.tier as SubscriptionTier) || "STARTER";

        if (businessId) {
          let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          let subscriptionStatus = "active";
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription as any)?.id;

          if (subId) {
            try {
              const sub = await this.stripe.subscriptions.retrieve(subId);
              subscriptionStatus = sub.status;
              const itemEnd =
                (sub as any).items?.data?.[0]?.current_period_end ||
                (sub as any).current_period_end;
              if (itemEnd) {
                periodEnd = new Date(itemEnd * 1000);
              }
            } catch (err: any) {
              console.warn("Could not retrieve subscription details from Stripe:", err.message);
            }
          }

          await prisma.business.update({
            where: { id: businessId },
            data: {
              subscriptionTier: tier,
              subscriptionStatus,
              stripeCustomerId: (session.customer as string) || undefined,
              stripeSubscriptionId: subId || undefined,
              currentPeriodEnd: periodEnd,
            },
          });
          console.log(`Updated business ${businessId} to tier ${tier} until ${periodEnd.toISOString()}`);
        } else {
          console.warn("Webhook checkout session received without associated businessId:", session.id);
        }
        break;
      }

      case "invoice.paid": {
        const rawInvoice = event.data.object as any;
        const subId =
          typeof rawInvoice.subscription === "string"
            ? rawInvoice.subscription
            : rawInvoice.subscription?.id ||
              rawInvoice.lines?.data?.[0]?.subscription;

        if (subId) {
          const biz = await prisma.business.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (biz) {
            let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const linePeriodEnd = rawInvoice.lines?.data?.[0]?.period?.end;
            if (linePeriodEnd) {
              periodEnd = new Date(linePeriodEnd * 1000);
            }

            await prisma.business.update({
              where: { id: biz.id },
              data: {
                subscriptionStatus: "active",
                currentPeriodEnd: periodEnd,
              },
            });
            console.log(`Invoice paid for business ${biz.id}, renewal extended to ${periodEnd.toISOString()}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const rawSub = sub as any;
        const biz = await prisma.business.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (biz) {
          const updateData: {
            subscriptionStatus: string;
            currentPeriodEnd?: Date;
            subscriptionTier?: SubscriptionTier;
          } = {
            subscriptionStatus: sub.status,
          };

          const itemEnd = rawSub.items?.data?.[0]?.current_period_end || rawSub.current_period_end;
          if (itemEnd) {
            updateData.currentPeriodEnd = new Date(itemEnd * 1000);
          }

          // Detect if tier changed via customer portal
          const priceId = sub.items?.data?.[0]?.price?.id;
          if (priceId) {
            for (const candidateTier of ["AGENCY", "PRO", "GROWTH", "STARTER"] as SubscriptionTier[]) {
              if (
                process.env[`STRIPE_PRICE_${candidateTier}`] === priceId ||
                process.env[`STRIPE_PRICE_${candidateTier}_MONTHLY`] === priceId ||
                process.env[`STRIPE_PRICE_${candidateTier}_ANNUAL`] === priceId
              ) {
                updateData.subscriptionTier = candidateTier;
                break;
              }
            }
          }

          await prisma.business.update({
            where: { id: biz.id },
            data: updateData,
          });
          console.log(`Updated subscription for business ${biz.id}: status=${sub.status}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const rawInvoice = event.data.object as any;
        const subId =
          typeof rawInvoice.subscription === "string"
            ? rawInvoice.subscription
            : rawInvoice.subscription?.id ||
              rawInvoice.lines?.data?.[0]?.subscription;

        if (subId) {
          const biz = await prisma.business.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (biz) {
            await prisma.business.update({
              where: { id: biz.id },
              data: {
                subscriptionStatus: "past_due",
              },
            });
            console.warn(`Payment failed for business ${biz.id}. Marked past_due.`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const biz = await prisma.business.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (biz) {
          await prisma.business.update({
            where: { id: biz.id },
            data: {
              subscriptionTier: "FREE",
              subscriptionStatus: "canceled",
            },
          });
          console.log(`Subscription deleted for business ${biz.id}. Downgraded to FREE.`);
        }
        break;
      }

      default:
        console.log("Stripe event received (unhandled type):", event.type);
    }

    return { received: true };
  }
}
