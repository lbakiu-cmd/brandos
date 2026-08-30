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
}
