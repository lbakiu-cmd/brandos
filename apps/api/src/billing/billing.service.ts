import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, SubscriptionTier } from "@brandos/database";

export const PRICING_PLANS = {
  FREE: {
    id: "FREE",
    name: "Free Discovery",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "Essential AI scan & baseline audit for single business owners.",
    features: [
      "1 Business Profile",
      "Public AI Visibility Scan",
      "Basic SEO & Schema Check",
      "Community Support",
    ],
    limits: {
      businesses: 1,
      auditsPerMonth: 3,
      competitors: 1,
      scheduledPosts: 5,
    },
  },
  STARTER: {
    id: "STARTER",
    name: "Starter Growth",
    priceMonthly: 49,
    priceAnnual: 470,
    description: "Complete visibility engine for growing local businesses.",
    features: [
      "1 Business Profile",
      "Unlimited 4-Channel Audits",
      "1-Click Copy Code Fixes (Schema, llms.txt)",
      "Multi-Channel Content Studio (50 posts/mo)",
      "Unified Customer Inbox",
      "Standard AI Visibility Reports",
    ],
    limits: {
      businesses: 1,
      auditsPerMonth: 50,
      competitors: 3,
      scheduledPosts: 50,
    },
  },
  GROWTH: {
    id: "GROWTH",
    name: "AI Dominance",
    priceMonthly: 99,
    priceAnnual: 950,
    description: "Advanced AI search optimization, competitor tracking, and review auto-responder.",
    features: [
      "3 Business Profiles",
      "Competitor AI Head-to-Head Benchmarking",
      "Automated AI Google Review Responder",
      "Daily Multi-Engine LLM Citation Monitoring",
      "Priority BullMQ Publishing Pipeline",
      "Executive PDF White-Label Reports",
    ],
    limits: {
      businesses: 3,
      auditsPerMonth: 200,
      competitors: 10,
      scheduledPosts: 250,
    },
  },
  AGENCY: {
    id: "AGENCY",
    name: "Agency / Enterprise",
    priceMonthly: 299,
    priceAnnual: 2870,
    description: "Scale AI search optimization across multiple clients and locations.",
    features: [
      "15 Business Profiles",
      "Unlimited Competitor Tracking",
      "Custom Brand White-Labeling",
      "Automated Monthly Client Reports",
      "Multi-seat Team Management (10 Seats)",
      "Dedicated Account Manager",
    ],
    limits: {
      businesses: 15,
      auditsPerMonth: 1000,
      competitors: 50,
      scheduledPosts: 1000,
    },
  },
};

@Injectable()
export class BillingService {
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
      plan,
      allPlans: Object.values(PRICING_PLANS),
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
      message: `Successfully upgraded to ${targetTier} plan.`,
      businessId: updated.id,
      tier: updated.subscriptionTier,
      plan: PRICING_PLANS[targetTier],
    };
  }
}
