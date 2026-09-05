import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { prisma, Role } from "@brandos/database";
import { ActivityService } from "../activity/activity.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly activity: ActivityService,
    private readonly mail: MailService
  ) {}

  /**
   * List all team members belonging to a business workspace
   */
  async listMembers(businessId: string) {
    const memberships = await prisma.membership.findMany({
      where: { businessId },
      include: {
        user: {
          include: {
            sessions: {
              where: { expiresAt: { gte: new Date() } },
              select: {
                id: true,
                ip: true,
                userAgent: true,
                expiresAt: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                activityLogs: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => {
      const { passwordHash: _ignored, ...safeUser } = m.user;
      return {
        membershipId: m.id,
        role: m.role,
        joinedAt: m.createdAt,
        user: {
          ...safeUser,
          activeSessionsCount: m.user.sessions.length,
          activityCount: m.user._count.activityLogs,
        },
      };
    });
  }

  /**
   * Super-admin view: List all registered users across the entire system
   */
  async listAllPlatformUsers() {
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            business: {
              select: { id: true, name: true, subscriptionTier: true },
            },
          },
        },
        sessions: {
          where: { expiresAt: { gte: new Date() } },
          select: { id: true, ip: true, userAgent: true, expiresAt: true, createdAt: true },
        },
        _count: {
          select: { activityLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return users.map((u) => {
      const { passwordHash: _ignored, ...safeUser } = u;
      return {
        ...safeUser,
        activeSessionsCount: u.sessions.length,
        activityCount: u._count.activityLogs,
        businesses: u.memberships.map((m) => ({
          id: m.business.id,
          name: m.business.name,
          role: m.role,
          tier: m.business.subscriptionTier,
        })),
      };
    });
  }

  /**
   * Invite or add a user to the business workspace
   */
  async inviteUser(
    businessId: string,
    actorUserId: string,
    data: {
      email?: string;
      phone?: string;
      name?: string;
      role?: Role;
    }
  ) {
    if (!data.email && !data.phone) {
      throw new BadRequestException("Either an email address or phone number is required.");
    }

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });

    const targetEmail = data.email ? data.email.trim().toLowerCase() : null;
    const targetPhone = data.phone ? data.phone.trim() : null;
    const assignedRole = data.role || Role.MEMBER;

    let user: any = null;

    if (targetEmail) {
      user = await prisma.user.findUnique({ where: { email: targetEmail } });
    } else if (targetPhone) {
      user = await prisma.user.findUnique({ where: { phone: targetPhone } });
    }

    if (!user) {
      // Create new invited user
      user = await prisma.user.create({
        data: {
          email: targetEmail,
          phone: targetPhone,
          name: data.name?.trim() || (targetEmail ? targetEmail.split("@")[0] : targetPhone),
          status: "ACTIVE",
          authProvider: targetEmail ? "EMAIL" : "PHONE",
        },
      });
    }

    // Check if membership already exists
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException("This user is already a member of this workspace.");
    }

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        businessId,
        role: assignedRole,
      },
    });

    // Log activity
    await this.activity.log({
      userId: actorUserId,
      businessId,
      action: "USER_INVITED",
      category: "TEAM",
      entityType: "USER",
      entityId: user.id,
      description: `Invited ${user.name || targetEmail || targetPhone} to the team as ${assignedRole}`,
      metadata: {
        invitedUser: { id: user.id, email: targetEmail, phone: targetPhone, name: user.name },
        role: assignedRole,
      },
    });

    // Send invitation email if email provided
    if (targetEmail) {
      this.mail
        .sendWelcomeEmail(targetEmail, user.name || targetEmail.split("@")[0], business.name)
        .catch((err) => this.logger.warn(`Failed to dispatch invite email: ${err.message}`));
    }

    return {
      success: true,
      membership,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      message: `User invited successfully as ${assignedRole}.`,
    };
  }

  /**
   * Update member role in business workspace
   */
  async updateRole(
    businessId: string,
    actorUserId: string,
    targetUserId: string,
    newRole: Role
  ) {
    if (actorUserId === targetUserId && newRole !== Role.OWNER) {
      // Check if user is the sole owner
      const owners = await prisma.membership.count({
        where: { businessId, role: Role.OWNER },
      });
      if (owners <= 1) {
        throw new BadRequestException("Cannot demote the sole workspace owner. Assign another owner first.");
      }
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_businessId: {
          userId: targetUserId,
          businessId,
        },
      },
      include: { user: true },
    });

    if (!membership) {
      throw new NotFoundException("User membership not found in this workspace.");
    }

    const oldRole = membership.role;
    const updated = await prisma.membership.update({
      where: { id: membership.id },
      data: { role: newRole },
    });

    await this.activity.log({
      userId: actorUserId,
      businessId,
      action: "ROLE_CHANGED",
      category: "TEAM",
      entityType: "MEMBERSHIP",
      entityId: membership.id,
      description: `Updated role for ${membership.user.name || membership.user.email} from ${oldRole} to ${newRole}`,
      metadata: { targetUserId, oldRole, newRole },
    });

    return { success: true, role: updated.role, message: `Role updated to ${newRole}.` };
  }

  /**
   * Update user status (ACTIVE, SUSPENDED, DEACTIVATED)
   */
  async updateUserStatus(
    businessId: string,
    actorUserId: string,
    targetUserId: string,
    status: string
  ) {
    const validStatuses = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${validStatuses.join(", ")}`);
    }

    const targetUser = await prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
    });

    await prisma.user.update({
      where: { id: targetUserId },
      data: { status },
    });

    // If deactivated or suspended, revoke all active sessions
    if (status !== "ACTIVE") {
      await prisma.session.deleteMany({ where: { userId: targetUserId } });
    }

    await this.activity.log({
      userId: actorUserId,
      businessId,
      action: "USER_STATUS_UPDATED",
      category: "TEAM",
      entityType: "USER",
      entityId: targetUserId,
      description: `Set status of user ${targetUser.name || targetUser.email} to ${status}`,
      metadata: { targetUserId, newStatus: status },
    });

    return { success: true, status, message: `User status changed to ${status}.` };
  }

  /**
   * Remove member from business workspace
   */
  async removeMember(businessId: string, actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      throw new BadRequestException("You cannot remove yourself from the workspace directly.");
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_businessId: {
          userId: targetUserId,
          businessId,
        },
      },
      include: { user: true },
    });

    if (!membership) {
      throw new NotFoundException("Member not found in this workspace.");
    }

    if (membership.role === Role.OWNER) {
      throw new BadRequestException("Cannot remove a workspace Owner. Change their role first.");
    }

    await prisma.membership.delete({ where: { id: membership.id } });

    await this.activity.log({
      userId: actorUserId,
      businessId,
      action: "USER_REMOVED",
      category: "TEAM",
      entityType: "USER",
      entityId: targetUserId,
      description: `Removed ${membership.user.name || membership.user.email} from workspace team`,
      metadata: { removedUserId: targetUserId, email: membership.user.email },
    });

    return { success: true, message: "Member removed from workspace." };
  }

  /**
   * View active sessions for a user
   */
  async getUserSessions(targetUserId: string) {
    return prisma.session.findMany({
      where: {
        userId: targetUserId,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Revoke a specific active session
   */
  async revokeSession(actorUserId: string, businessId: string, sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new NotFoundException("Session not found or already expired.");
    }

    await prisma.session.delete({ where: { id: sessionId } });

    await this.activity.log({
      userId: actorUserId,
      businessId,
      action: "SESSION_REVOKED",
      category: "SECURITY",
      entityType: "SESSION",
      entityId: sessionId,
      description: `Revoked active session for ${session.user.name || session.user.email} (${session.ip || "unknown IP"})`,
      metadata: { sessionId, targetUserId: session.userId, ip: session.ip },
    });

    return { success: true, message: "Session revoked successfully." };
  }

  /**
   * Super Admin: Reset Entire Platform Data (Wipes all non-superadmin users, businesses, audits, and cache)
   */
  async resetEntireSystem(superAdminUserId: string) {
    const actor = await prisma.user.findUnique({ where: { id: superAdminUserId } });
    if (!actor?.isSuperAdmin) {
      throw new ForbiddenException("Access denied. Super Administrator authority required.");
    }

    this.logger.warn(`Super Admin ${actor.email} initiated FULL PLATFORM DATA RESET`);

    // 1. Identify Master Business and Super Admin
    let masterBiz = await prisma.business.findFirst({
      where: { name: "BrandOS Global Headquarters" },
    });

    if (!masterBiz) {
      masterBiz = await prisma.business.create({
        data: {
          name: "BrandOS Global Headquarters",
          website: "https://brandoseye.com",
          industry: "Enterprise AI & Growth Tech",
          city: "Austin, TX",
          phone: "+1 (512) 555-0100",
          email: "superadmin@brandoseye.com",
          subscriptionTier: "AGENCY",
        },
      });
    }

    // 2. Delete non-master businesses and all associated cascade relations
    const otherBusinesses = await prisma.business.findMany({
      where: { id: { not: masterBiz.id } },
      select: { id: true },
    });
    const bizIdsToDelete = otherBusinesses.map((b) => b.id);

    if (bizIdsToDelete.length > 0) {
      await prisma.googleReview.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.auditFinding.deleteMany({ where: { audit: { businessId: { in: bizIdsToDelete } } } });
      await prisma.competitorMention.deleteMany({ where: { competitor: { businessId: { in: bizIdsToDelete } } } });
      await prisma.websiteAudit.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.gbpAudit.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.socialAudit.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.aiVisibilityReport.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.recommendation.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.competitor.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.dashboardWidget.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.metricSnapshot.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.businessSnapshot.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.integrationAccount.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.membership.deleteMany({ where: { businessId: { in: bizIdsToDelete } } });
      await prisma.business.deleteMany({ where: { id: { in: bizIdsToDelete } } });
    }

    // 3. Delete non-superadmin users
    const nonSuperAdmins = await prisma.user.findMany({
      where: { isSuperAdmin: false },
      select: { id: true },
    });
    const userIdsToDelete = nonSuperAdmins.map((u) => u.id);

    if (userIdsToDelete.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: userIdsToDelete } } });
      await prisma.membership.deleteMany({ where: { userId: { in: userIdsToDelete } } });
      await prisma.user.deleteMany({ where: { id: { in: userIdsToDelete } } });
    }

    // 4. Ensure Super Admin is member of Master Business
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: superAdminUserId, businessId: masterBiz.id },
    });
    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          userId: superAdminUserId,
          businessId: masterBiz.id,
          role: Role.SUPER_ADMIN,
        },
      });
    }

    await this.activity.log({
      userId: superAdminUserId,
      businessId: masterBiz.id,
      action: "PLATFORM_DATA_RESET",
      category: "SECURITY",
      entityType: "DATABASE",
      entityId: "postgres",
      description: `Super Admin executed full system reset. All test businesses and user profiles wiped cleanly.`,
    });

    return {
      success: true,
      message: `System reset complete. ${bizIdsToDelete.length} businesses and ${userIdsToDelete.length} user accounts removed. Super Admin environment is ready.`,
      businessesRemoved: bizIdsToDelete.length,
      usersRemoved: userIdsToDelete.length,
    };
  }

  /**
   * Super Admin: Delete a specific user profile
   */
  async deleteUserBySuperAdmin(superAdminUserId: string, targetUserId: string) {
    const actor = await prisma.user.findUnique({ where: { id: superAdminUserId } });
    if (!actor?.isSuperAdmin) {
      throw new ForbiddenException("Super Administrator authority required.");
    }
    if (superAdminUserId === targetUserId) {
      throw new BadRequestException("Super Administrator cannot delete their own account.");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        memberships: {
          include: { business: true },
        },
      },
    });

    if (!targetUser) {
      throw new NotFoundException("Target user not found.");
    }

    // Identify businesses exclusively owned by this user
    for (const mem of targetUser.memberships) {
      if (mem.role === Role.OWNER) {
        const ownerCount = await prisma.membership.count({
          where: { businessId: mem.businessId, role: Role.OWNER },
        });
        if (ownerCount <= 1) {
          // Delete exclusive business
          await this.deleteBusinessBySuperAdmin(superAdminUserId, mem.businessId).catch(() => null);
        }
      }
    }

    await prisma.session.deleteMany({ where: { userId: targetUserId } });
    await prisma.membership.deleteMany({ where: { userId: targetUserId } });
    await prisma.user.delete({ where: { id: targetUserId } });

    return { success: true, message: `User ${targetUser.email || targetUser.name} deleted successfully.` };
  }

  /**
   * Super Admin: Delete a specific business workspace
   */
  async deleteBusinessBySuperAdmin(superAdminUserId: string, targetBusinessId: string) {
    const actor = await prisma.user.findUnique({ where: { id: superAdminUserId } });
    if (!actor?.isSuperAdmin) {
      throw new ForbiddenException("Super Administrator authority required.");
    }

    const biz = await prisma.business.findUnique({ where: { id: targetBusinessId } });
    if (!biz) {
      throw new NotFoundException("Business not found.");
    }
    if (biz.name === "BrandOS Global Headquarters") {
      throw new BadRequestException("Cannot delete the Master BrandOS Global Headquarters workspace.");
    }

    await prisma.googleReview.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.auditFinding.deleteMany({ where: { audit: { businessId: targetBusinessId } } });
    await prisma.competitorMention.deleteMany({ where: { competitor: { businessId: targetBusinessId } } });
    await prisma.websiteAudit.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.gbpAudit.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.socialAudit.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.aiVisibilityReport.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.recommendation.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.competitor.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.dashboardWidget.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.metricSnapshot.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.businessSnapshot.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.integrationAccount.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.membership.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.business.delete({ where: { id: targetBusinessId } });

    return { success: true, message: `Business ${biz.name} and all associated records deleted successfully.` };
  }

  /**
   * Super Admin: Reset all data and audits for a specific business
   */
  async resetBusinessDataBySuperAdmin(superAdminUserId: string, targetBusinessId: string) {
    const actor = await prisma.user.findUnique({ where: { id: superAdminUserId } });
    if (!actor?.isSuperAdmin) {
      throw new ForbiddenException("Super Administrator authority required.");
    }

    const biz = await prisma.business.findUnique({ where: { id: targetBusinessId } });
    if (!biz) {
      throw new NotFoundException("Business not found.");
    }

    await prisma.googleReview.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.auditFinding.deleteMany({ where: { audit: { businessId: targetBusinessId } } });
    await prisma.competitorMention.deleteMany({ where: { competitor: { businessId: targetBusinessId } } });
    await prisma.websiteAudit.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.gbpAudit.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.socialAudit.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.aiVisibilityReport.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.recommendation.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.competitor.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.metricSnapshot.deleteMany({ where: { businessId: targetBusinessId } });
    await prisma.businessSnapshot.deleteMany({ where: { businessId: targetBusinessId } });

    // Reset integration metrics
    await prisma.integrationAccount.updateMany({
      where: { businessId: targetBusinessId },
      data: { metricsCache: null, lastSyncedAt: null },
    });

    return { success: true, message: `All audits, metrics, and snapshots for ${biz.name} have been reset.` };
  }
}
