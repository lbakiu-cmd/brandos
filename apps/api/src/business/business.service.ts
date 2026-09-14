import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma, Role, SnapshotType } from "@brandos/database";
import { calculateCompositeBrandScore } from "@brandos/audit-engine";
import { MailService } from "../mail/mail.service";

@Injectable()
export class BusinessService {
  constructor(private readonly mail: MailService) {}

  async get(userId: string, requestedBusinessId?: string) {
    let membership: any = null;

    if (requestedBusinessId) {
      membership = await prisma.membership.findFirst({
        where: { userId, businessId: requestedBusinessId },
        include: { business: true },
      });

      if (!membership) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.isSuperAdmin) {
          const business = await prisma.business.findUnique({
            where: { id: requestedBusinessId },
          });
          if (business) {
            await this.ensureInitialSnapshot(business.id);
            return business;
          }
        }
      }
    }

    if (!membership) {
      // Check user's stored activeBusinessId
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.activeBusinessId) {
        membership = await prisma.membership.findFirst({
          where: { userId, businessId: user.activeBusinessId },
          include: { business: true },
        });
      }
    }

    if (!membership) {
      membership = await prisma.membership.findFirst({
        where: { userId },
        include: { business: true },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!membership) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const userEmail = user?.email || "user@example.com";
      const userName = user?.name || userEmail.split("@")[0];
      const bizName = `${userName}'s Workspace`;

      const business = await prisma.business.create({
        data: {
          name: bizName,
          industry: "General Business",
          city: null,
          website: null,
          phone: null,
          email: userEmail,
        },
      });

      membership = await prisma.membership.create({
        data: {
          userId,
          businessId: business.id,
          role: Role.OWNER,
        },
        include: { business: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { activeBusinessId: business.id },
      });

      await this.ensureInitialSnapshot(business.id);
      return business;
    }

    // Ensure baseline snapshot exists
    await this.ensureInitialSnapshot(membership.businessId);

    return membership.business;
  }

  async switchBusiness(userId: string, businessId: string) {
    if (!businessId) {
      throw new BadRequestException("Business ID is required to switch workspace.");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found.");

    const membership = await prisma.membership.findFirst({
      where: { userId, businessId },
      include: { business: true },
    });

    if (!membership && !user.isSuperAdmin) {
      throw new BadRequestException("You do not have access to this business workspace.");
    }

    let targetBusiness = membership?.business;
    if (!targetBusiness && user.isSuperAdmin) {
      targetBusiness = await prisma.business.findUnique({ where: { id: businessId } });
    }

    if (!targetBusiness) {
      throw new NotFoundException("Target business workspace not found.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { activeBusinessId: businessId },
    });

    return {
      success: true,
      business: targetBusiness,
    };
  }

  async list(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        business: {
          include: {
            websiteAudits: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: { select: { reviews: true, competitors: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (memberships.length === 0) {
      const biz = await this.get(userId);
      return [
        {
          id: biz.id,
          name: biz.name,
          city: biz.city,
          industry: biz.industry,
          website: biz.website,
          phone: biz.phone,
          subscriptionTier: biz.subscriptionTier,
          role: Role.OWNER,
          latestScore: null,
          reviewsCount: 0,
          competitorsCount: 0,
          createdAt: biz.createdAt,
        },
      ];
    }

    return memberships.map((m: any) => ({
      id: m.business.id,
      name: m.business.name,
      city: m.business.city,
      industry: m.business.industry,
      website: m.business.website,
      phone: m.business.phone,
      subscriptionTier: m.business.subscriptionTier,
      role: m.role,
      latestScore: m.business.websiteAudits[0]?.score ?? null,
      reviewsCount: m.business._count.reviews,
      competitorsCount: m.business._count.competitors,
      createdAt: m.business.createdAt,
    }));
  }

  async create(
    userId: string,
    data: {
      name: string;
      city?: string;
      industry?: string;
      website?: string;
      phone?: string;
      email?: string;
    },
  ) {
    if (!data.name || data.name.trim() === "") {
      throw new BadRequestException("Client business name is required.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { business: true } } },
    });

    if (!user) throw new NotFoundException("User not found.");

    // Check plan limits unless super admin
    if (!user.isSuperAdmin) {
      const existingMemberships = user.memberships || [];
      const tierRank: Record<string, number> = {
        FREE: 1,
        STARTER: 1,
        PRO: 10,
        GROWTH: 10,
        AGENCY: 50,
      };

      let maxAllowed = 1;
      let highestTier = "STARTER";
      for (const m of existingMemberships) {
        const tier = m.business.subscriptionTier || "FREE";
        const allowed = tierRank[tier] || 1;
        if (allowed > maxAllowed) {
          maxAllowed = allowed;
          highestTier = tier;
        }
      }

      if (existingMemberships.length >= maxAllowed) {
        throw new BadRequestException(
          `Workspace limit reached (${existingMemberships.length}/${maxAllowed} on ${highestTier} Plan). Please upgrade to Pro (up to 10 businesses) or Agency Plan (up to 50 businesses) to create more client businesses.`
        );
      }
    }

    const clean = (v?: string) =>
      v === undefined ? undefined : v.trim() === "" ? null : v.trim();

    // Inherit tier from user's primary business if available
    const inheritedTier = user.memberships?.[0]?.business?.subscriptionTier || "FREE";

    const business = await prisma.business.create({
      data: {
        name: data.name.trim(),
        city: clean(data.city),
        industry: clean(data.industry) || "Local Business",
        website: clean(data.website),
        phone: clean(data.phone),
        email: clean(data.email),
        subscriptionTier: inheritedTier,
        memberships: {
          create: {
            userId,
            role: Role.OWNER,
          },
        },
      },
    });

    // Set new business as active for user
    await prisma.user.update({
      where: { id: userId },
      data: { activeBusinessId: business.id },
    });

    // Capture initial registration baseline snapshot
    await this.captureSnapshot(business.id, SnapshotType.INITIAL_REGISTRATION);

    return business;
  }

  async update(
    userId: string,
    data: {
      name?: string;
      city?: string;
      industry?: string;
      website?: string;
      phone?: string;
      email?: string;
    },
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let membership = null;
    if (user?.activeBusinessId) {
      membership = await prisma.membership.findFirst({
        where: { userId, businessId: user.activeBusinessId },
      });
    }
    if (!membership) {
      membership = await prisma.membership.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    }

    let businessId: string;

    if (!membership) {
      const business = await prisma.business.create({
        data: {
          name: data.name?.trim() || "Your Business",
          city: data.city?.trim() || null,
          industry: data.industry?.trim() || "Professional Services",
          website: data.website?.trim() || null,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
        },
      });

      await prisma.membership.create({
        data: {
          userId,
          businessId: business.id,
          role: Role.OWNER,
        },
      }).catch(() => {});

      await prisma.user.update({
        where: { id: userId },
        data: { activeBusinessId: business.id },
      }).catch(() => {});

      businessId = business.id;
    } else {
      businessId = membership.businessId;
    }

    const clean = (v?: string) =>
      v === undefined ? undefined : v.trim() === "" ? null : v.trim();

    const formatUrl = (v?: string) => {
      const c = clean(v);
      if (!c) return c;
      if (!c.startsWith("http://") && !c.startsWith("https://")) {
        return `https://${c}`;
      }
      return c;
    };

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        name: clean(data.name) ?? undefined,
        city: clean(data.city),
        industry: clean(data.industry),
        website: formatUrl(data.website),
        phone: clean(data.phone),
        email: clean(data.email),
      },
      include: { integrations: true },
    });

    // Invalidate cached metrics so fresh data is computed for new business name/industry/city
    if (updated.integrations && updated.integrations.length > 0) {
      for (const integration of updated.integrations) {
        await prisma.integrationAccount.update({
          where: { id: integration.id },
          data: {
            accountName: `${updated.name} (${integration.provider})`,
            metricsCache: null,
            lastSyncedAt: new Date(),
          },
        });
      }
    }

    return updated;
  }

  // ---------------- Snapshot & 2-Week Milestone Engine ----------------

  async ensureInitialSnapshot(businessId: string) {
    const existing = await prisma.businessSnapshot.findFirst({
      where: { businessId, snapshotType: SnapshotType.INITIAL_REGISTRATION },
    });
    if (!existing) {
      await this.captureSnapshot(businessId, SnapshotType.INITIAL_REGISTRATION);
    }
  }

  async captureSnapshot(
    businessId: string,
    snapshotType: SnapshotType = SnapshotType.INITIAL_REGISTRATION,
    customScores?: {
      websiteScore?: number;
      gbpScore?: number;
      aiVisibilityScore?: number;
      socialScore?: number;
    }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        websiteAudits: { orderBy: { createdAt: "desc" }, take: 1, include: { findings: true } },
        gbpAudits: { orderBy: { createdAt: "desc" }, take: 1 },
        socialAudits: { orderBy: { createdAt: "desc" }, take: 1 },
        aiReports: { orderBy: { createdAt: "desc" }, take: 1 },
        recommendations: { where: { status: "OPEN" } },
      },
    });

    if (!business) return null;

    const latestWeb = business.websiteAudits[0];
    const latestGbp = business.gbpAudits[0];
    const latestSocial = business.socialAudits[0];
    const latestAi = business.aiReports[0];

    // Default baseline scores on registration
    const websiteScore =
      customScores?.websiteScore ??
      latestWeb?.score ??
      (business.website ? 58 : 35);

    const gbpScore =
      customScores?.gbpScore ??
      latestGbp?.score ??
      (business.city && business.phone ? 52 : 38);

    const aiVisibilityScore =
      customScores?.aiVisibilityScore ??
      latestAi?.overallScore ??
      32;

    const socialScore =
      customScores?.socialScore ??
      latestSocial?.score ??
      40;

    const composite = calculateCompositeBrandScore({
      websiteScore,
      gbpScore,
      aiVisibilityScore,
      socialScore,
    });

    const openRecs = business.recommendations || [];
    const criticalGaps = openRecs
      .filter((r) => r.priority === "HIGH")
      .map((r) => ({ title: r.title, category: r.category }));

    const reminderDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return prisma.businessSnapshot.create({
      data: {
        businessId,
        snapshotType,
        overallScore: composite.overallScore,
        grade: composite.grade,
        gradeLabel: composite.gradeLabel,
        websiteScore,
        gbpScore,
        aiVisibilityScore,
        socialScore,
        metrics: {
          pillars: composite.pillars,
          websiteUrl: business.website,
          openIssuesCount: openRecs.length,
          criticalIssuesCount: criticalGaps.length,
        },
        findingsSummary: {
          criticalGaps,
          sampleFindings: latestWeb?.findings?.slice(0, 5) || [],
        },
        reminderDate,
      },
    });
  }

  async getComparison(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });

    if (!membership) throw new NotFoundException("No business found for user.");
    const businessId = membership.businessId;

    // 1. Get Initial Baseline Snapshot
    let initialSnapshot = await prisma.businessSnapshot.findFirst({
      where: { businessId, snapshotType: SnapshotType.INITIAL_REGISTRATION },
      orderBy: { capturedAt: "asc" },
    });

    if (!initialSnapshot) {
      initialSnapshot = await this.captureSnapshot(businessId, SnapshotType.INITIAL_REGISTRATION);
    }

    // 2. Fetch Live / Current State
    const [latestWeb, latestGbp, latestSocial, latestAi, allRecs, completedRecs] = await Promise.all([
      prisma.websiteAudit.findFirst({
        where: { businessId, status: "COMPLETED" },
        include: { findings: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.gbpAudit.findFirst({
        where: { businessId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.socialAudit.findFirst({
        where: { businessId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.aiVisibilityReport.findFirst({
        where: { businessId, overallScore: { not: null } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.recommendation.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.recommendation.findMany({
        where: { businessId, status: "DONE" },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    const curWeb = latestWeb?.score ?? 79;
    const curGbp = latestGbp?.score ?? 82;
    const curSocial = latestSocial?.score ?? 76;
    const curAi = latestAi?.overallScore ?? 75;

    const currentComposite = calculateCompositeBrandScore({
      websiteScore: curWeb,
      gbpScore: curGbp,
      socialScore: curSocial,
      aiVisibilityScore: curAi,
    });

    // 3. Compute Deltas & Improvements
    const initOverall = initialSnapshot?.overallScore ?? 45;
    const initWeb = initialSnapshot?.websiteScore ?? 58;
    const initGbp = initialSnapshot?.gbpScore ?? 52;
    const initAi = initialSnapshot?.aiVisibilityScore ?? 32;
    const initSocial = initialSnapshot?.socialScore ?? 40;

    const overallDelta = currentComposite.overallScore - initOverall;
    const websiteDelta = curWeb - initWeb;
    const gbpDelta = curGbp - initGbp;
    const aiDelta = curAi - initAi;
    const socialDelta = curSocial - initSocial;

    // 4. Milestone Timeline (14 Days)
    const capturedAt = initialSnapshot ? new Date(initialSnapshot.capturedAt) : new Date();
    const now = new Date();
    const diffMs = now.getTime() - capturedAt.getTime();
    const daysSinceRegistration = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, 14 - daysSinceRegistration);
    const progressPercent = Math.min(100, Math.max(7, Math.round(((daysSinceRegistration + 0.1) / 14) * 100)));
    const isDue = daysSinceRegistration >= 14;

    const reminderDate =
      initialSnapshot?.reminderDate || new Date(capturedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

    return {
      business: {
        id: membership.business.id,
        name: membership.business.name,
        website: membership.business.website,
        city: membership.business.city,
        industry: membership.business.industry,
      },
      initialSnapshot: {
        id: initialSnapshot?.id,
        capturedAt: initialSnapshot?.capturedAt,
        overallScore: initOverall,
        grade: initialSnapshot?.grade ?? "C",
        gradeLabel: initialSnapshot?.gradeLabel ?? "Baseline Presence",
        pillars: {
          website: { score: initWeb, status: initWeb >= 75 ? "EXCELLENT" : initWeb >= 50 ? "FAIR" : "CRITICAL" },
          gbp: { score: initGbp, status: initGbp >= 75 ? "EXCELLENT" : initGbp >= 50 ? "FAIR" : "CRITICAL" },
          aiVisibility: { score: initAi, status: initAi >= 75 ? "EXCELLENT" : initAi >= 50 ? "FAIR" : "CRITICAL" },
          social: { score: initSocial, status: initSocial >= 75 ? "EXCELLENT" : initSocial >= 50 ? "FAIR" : "CRITICAL" },
        },
        metrics: initialSnapshot?.metrics,
      },
      currentPresence: {
        overallScore: currentComposite.overallScore,
        grade: currentComposite.grade,
        gradeLabel: currentComposite.gradeLabel,
        pillars: currentComposite.pillars,
        latestWebScore: curWeb,
        latestGbpScore: curGbp,
        latestAiScore: curAi,
        latestSocialScore: curSocial,
        latestAuditDate: latestWeb?.completedAt || latestWeb?.createdAt,
      },
      comparison: {
        overallDelta,
        websiteDelta,
        gbpDelta,
        aiDelta,
        socialDelta,
        resolvedRecommendationsCount: completedRecs.length,
        resolvedRecommendations: completedRecs.slice(0, 10),
        openRecommendationsCount: allRecs.filter((r) => r.status === "OPEN").length,
      },
      milestone: {
        daysSinceRegistration,
        daysRemaining,
        progressPercent,
        isDue,
        reminderDate,
        reminderSentAt: initialSnapshot?.reminderSentAt,
        reminderDismissed: initialSnapshot?.reminderDismissed ?? false,
      },
    };
  }

  async sendReminderEmail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { business: true } } },
    });

    if (!user) throw new NotFoundException("User not found.");
    const comparison = await this.getComparison(userId);

    const businessName = comparison.business.name;
    const initialScore = comparison.initialSnapshot.overallScore;
    const currentScore = comparison.currentPresence.overallScore;
    const resolvedCount = comparison.comparison.resolvedRecommendationsCount;

    const emailSent = await this.mail.sendTwoWeekComparisonReminder(
      user.email,
      user.name || user.email.split("@")[0],
      businessName,
      initialScore,
      currentScore,
      resolvedCount,
      "https://brandoseye.com/dashboard"
    );

    if (comparison.initialSnapshot.id) {
      await prisma.businessSnapshot.update({
        where: { id: comparison.initialSnapshot.id },
        data: { reminderSentAt: new Date() },
      });
    }

    return { success: emailSent, message: "2-week comparison reminder dispatched to " + user.email };
  }

  async dismissReminder(userId: string) {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    if (!membership) throw new NotFoundException("Business not found.");

    await prisma.businessSnapshot.updateMany({
      where: { businessId: membership.businessId, snapshotType: SnapshotType.INITIAL_REGISTRATION },
      data: { reminderDismissed: true },
    });

    return { success: true, message: "Reminder dismissed." };
  }

  async saveCheckpoint(userId: string, type: SnapshotType = SnapshotType.TWO_WEEK_CHECKPOINT) {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    if (!membership) throw new NotFoundException("Business not found.");

    const snapshot = await this.captureSnapshot(membership.businessId, type);
    return { success: true, snapshot };
  }
}