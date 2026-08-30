import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@brandos/database";

export interface LogActivityParams {
  userId?: string | null;
  businessId?: string | null;
  action: string;
  category?: "AUTH" | "TEAM" | "INTEGRATIONS" | "SECURITY" | "AUDITS" | "SETTINGS" | "GENERAL";
  entityType?: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export interface ActivityFilterOptions {
  page?: number;
  limit?: number;
  category?: string;
  action?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  /**
   * Record a new activity or audit event
   */
  async log(params: LogActivityParams) {
    try {
      const activity = await prisma.activityLog.create({
        data: {
          userId: params.userId || null,
          businessId: params.businessId || null,
          action: params.action,
          category: params.category || "GENERAL",
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          description: params.description,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
        },
      });
      return activity;
    } catch (err: any) {
      this.logger.warn(`Failed to log activity event: ${err.message}`);
      return null;
    }
  }

  /**
   * Query filtered and paginated activity logs for a business workspace
   */
  /**
   * Query filtered and paginated activity logs for a business workspace or global platform
   */
  async list(businessId?: string | null, options: ActivityFilterOptions = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (businessId) {
      where.businessId = businessId;
    }

    if (options.category && options.category !== "ALL") {
      where.category = options.category;
    }

    if (options.action) {
      where.action = options.action;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        const end = new Date(options.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (options.search) {
      const search = options.search.trim();
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get activity stats for security & activity summary
   */
  async getStats(businessId?: string | null) {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const whereBase: any = {};
    if (businessId) {
      whereBase.businessId = businessId;
    }

    const [
      totalCount,
      count24h,
      authEvents24h,
      teamChanges7d,
      recentUniqueIps,
    ] = await Promise.all([
      prisma.activityLog.count({ where: whereBase }),
      prisma.activityLog.count({
        where: { ...whereBase, createdAt: { gte: last24h } },
      }),
      prisma.activityLog.count({
        where: {
          ...whereBase,
          category: "AUTH",
          createdAt: { gte: last24h },
        },
      }),
      prisma.activityLog.count({
        where: {
          ...whereBase,
          category: "TEAM",
          createdAt: { gte: last7d },
        },
      }),
      prisma.activityLog.findMany({
        where: { ...whereBase, createdAt: { gte: last7d }, ipAddress: { not: null } },
        select: { ipAddress: true },
        distinct: ["ipAddress"],
      }),
    ]);

    return {
      totalCount,
      activitiesLast24h: count24h,
      authEventsLast24h: authEvents24h,
      teamChangesLast7d: teamChanges7d,
      activeIpAddresses: recentUniqueIps.length,
    };
  }

  /**
   * Export activity logs as CSV or JSON
   */
  async exportLogs(businessId?: string | null, format: "json" | "csv" = "json") {
    const whereBase: any = {};
    if (businessId) {
      whereBase.businessId = businessId;
    }

    const logs = await prisma.activityLog.findMany({
      where: whereBase,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    if (format === "json") {
      return { data: logs, format: "json", filename: `brandos-activity-${Date.now()}.json` };
    }

    // CSV format
    const headers = ["Timestamp", "Category", "Action", "Description", "User", "Email", "IP Address", "User Agent"];
    const rows = logs.map((l) => [
      l.createdAt.toISOString(),
      l.category,
      l.action,
      `"${(l.description || "").replace(/"/g, '""')}"`,
      `"${(l.user?.name || "").replace(/"/g, '""')}"`,
      l.user?.email || l.user?.phone || "",
      l.ipAddress || "",
      `"${(l.userAgent || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return {
      data: csvContent,
      format: "csv",
      filename: `brandos-activity-${Date.now()}.csv`,
    };
  }
}
