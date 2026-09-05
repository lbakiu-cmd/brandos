import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { createHash, createHmac, randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { prisma, Role } from "@brandos/database";
import { MailService } from "../mail/mail.service";
import { ActivityService } from "../activity/activity.service";
import {
  generateTotpSecret,
  verifyTotpToken,
  generateBackupCodes,
  getOtpAuthUrl,
} from "./totp.util";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface Temp2faPayload {
  userId: string;
  purpose: "2fa_setup" | "2fa_login";
  proposedSecret?: string;
  exp: number;
}

function get2faSigningSecret(): string {
  return process.env.DATABASE_URL || "brandos_2fa_secure_key_2026";
}

export function createTemp2faToken(payload: Temp2faPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = createHmac("sha256", get2faSigningSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${hmac}`;
}

export function verifyTemp2faToken(token: string): Temp2faPayload {
  if (!token || typeof token !== "string") {
    throw new UnauthorizedException("2FA temporary token is missing or invalid.");
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new UnauthorizedException("Malformed 2FA temporary token.");
  }
  const [data, signature] = parts;
  const expectedSig = createHmac("sha256", get2faSigningSecret())
    .update(data)
    .digest("base64url");
  if (signature !== expectedSig) {
    throw new UnauthorizedException("2FA token verification failed.");
  }
  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    ) as Temp2faPayload;
    if (Date.now() > payload.exp) {
      throw new UnauthorizedException(
        "2FA temporary session expired. Please log in again."
      );
    }
    return payload;
  } catch (err: any) {
    throw new UnauthorizedException("Invalid 2FA temporary payload.");
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly mail: MailService,
    private readonly activity: ActivityService
  ) {}

  /**
   * Generates a 2FA prompt response (Setup or Verification Challenge)
   */
  async initiate2faForUser(
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string | null;
    },
    meta?: { ip?: string; userAgent?: string }
  ) {
    const isSetupRequired = !user.twoFactorEnabled || !user.twoFactorSecret;

    if (isSetupRequired) {
      const secret = generateTotpSecret(20);
      const backupCodes = generateBackupCodes(6);
      const qrCodeUri = getOtpAuthUrl({
        issuer: "BrandOS Eye",
        accountName: user.email || user.name || "User",
        secret,
      });

      const tempToken = createTemp2faToken({
        userId: user.id,
        purpose: "2fa_setup",
        proposedSecret: secret,
        exp: Date.now() + 15 * 60 * 1000, // 15 minutes to scan QR code
      });

      return {
        requires2fa: true,
        setupRequired: true,
        tempToken,
        secret,
        qrCodeUri,
        backupCodes,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        message:
          "Two-Factor Authentication is required. Please scan the QR code with Google Authenticator.",
      };
    } else {
      const tempToken = createTemp2faToken({
        userId: user.id,
        purpose: "2fa_login",
        exp: Date.now() + 10 * 60 * 1000, // 10 minutes to input 6-digit code
      });

      return {
        requires2fa: true,
        setupRequired: false,
        tempToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        message:
          "Please enter the 6-digit security code from Google Authenticator to complete sign-in.",
      };
    }
  }

  /**
   * 1. Register with Email + Password
   */
  async register(
    input: {
      email: string;
      password: string;
      name?: string;
      businessName?: string;
    },
    meta?: { ip?: string; userAgent?: string }
  ) {
    const email = input.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const businessName = input.businessName ?? email.split("@")[0] + " Business";
    const user = await prisma.user.create({
      data: {
        email,
        name: input.name ?? null,
        passwordHash,
        authProvider: "EMAIL",
        status: "ACTIVE",
        twoFactorEnabled: false,
        lastLoginAt: new Date(),
        memberships: {
          create: {
            role: Role.OWNER,
            business: {
              create: {
                name: businessName,
                email,
              },
            },
          },
        },
      },
      include: { memberships: true },
    });

    const primaryBizId = user.memberships[0]?.businessId;

    // Log Activity
    await this.activity.log({
      userId: user.id,
      businessId: primaryBizId,
      action: "AUTH_REGISTER_EMAIL",
      category: "AUTH",
      entityType: "USER",
      entityId: user.id,
      description: `Registered new account via Email: ${email}`,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    // Send transactional welcome email asynchronously
    this.mail
      .sendWelcomeEmail(email, input.name || email.split("@")[0], businessName)
      .catch((err) => this.logger.warn(`Failed to dispatch welcome email: ${err.message}`));

    // Enforce 2FA Setup
    return this.initiate2faForUser(user, meta);
  }

  /**
   * 2. Login with Email + Password
   */
  async login(
    email: string,
    password: string,
    meta?: { ip?: string; userAgent?: string }
  ) {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { memberships: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (user.status && user.status !== "ACTIVE") {
      throw new UnauthorizedException(
        `Your account is ${user.status.toLowerCase()}. Please contact support.`
      );
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Enforce 2FA Step
    return this.initiate2faForUser(user, meta);
  }

  /**
   * 3. Verify 2FA Setup (First Time)
   */
  async verify2faSetup(
    input: { tempToken: string; code: string; secret: string },
    meta?: { ip?: string; userAgent?: string }
  ) {
    const payload = verifyTemp2faToken(input.tempToken);
    if (payload.purpose !== "2fa_setup") {
      throw new BadRequestException("Invalid 2FA setup token.");
    }

    const secret = input.secret.trim();
    const isValid = verifyTotpToken(secret, input.code);
    if (!isValid) {
      throw new BadRequestException(
        "Invalid 6-digit code. Please check Google Authenticator and try again."
      );
    }

    const backupCodes = generateBackupCodes(6);

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
        lastLoginAt: new Date(),
      },
    });

    const membership = await prisma.membership.findFirst({
      where: { userId: payload.userId },
    });

    await this.activity.log({
      userId: payload.userId,
      businessId: membership?.businessId,
      action: "2FA_SETUP_COMPLETED",
      category: "SECURITY",
      entityType: "USER",
      entityId: payload.userId,
      description: "Successfully configured and enabled Google Authenticator 2FA",
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    const sessionRes = await this.issueSession(payload.userId, meta?.ip, meta?.userAgent);

    return {
      ...sessionRes,
      backupCodes,
      message: "Two-Factor Authentication successfully enabled.",
    };
  }

  /**
   * 4. Verify 2FA Login Challenge (Subsequent Logins)
   */
  async verify2faLogin(
    input: { tempToken: string; code: string },
    meta?: { ip?: string; userAgent?: string }
  ) {
    const payload = verifyTemp2faToken(input.tempToken);
    if (payload.purpose !== "2fa_login") {
      throw new BadRequestException("Invalid 2FA login token.");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { memberships: true },
    });

    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException("2FA is not enabled for this account.");
    }

    const cleanCode = input.code.trim().toUpperCase();
    const isTotpValid = verifyTotpToken(user.twoFactorSecret, cleanCode);

    let isBackupCodeValid = false;
    if (!isTotpValid && user.twoFactorBackupCodes?.length > 0) {
      const idx = user.twoFactorBackupCodes.indexOf(cleanCode);
      if (idx !== -1) {
        isBackupCodeValid = true;
        // Consume backup code
        const updatedCodes = [...user.twoFactorBackupCodes];
        updatedCodes.splice(idx, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: updatedCodes },
        });
      }
    }

    if (!isTotpValid && !isBackupCodeValid) {
      throw new BadRequestException(
        "Invalid 6-digit security code or backup recovery code."
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const primaryBizId = user.memberships[0]?.businessId;

    await this.activity.log({
      userId: user.id,
      businessId: primaryBizId,
      action: "AUTH_LOGIN_2FA_VERIFIED",
      category: "AUTH",
      entityType: "USER",
      entityId: user.id,
      description: `Completed 2FA verification via ${isBackupCodeValid ? "Backup Code" : "Google Authenticator"}`,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return this.issueSession(user.id, meta?.ip, meta?.userAgent);
  }

  /**
   * 5. Google Account Login / Verification with 2FA Gate
   */
  async loginWithGoogle(
    input: {
      idToken?: string;
      accessToken?: string;
      code?: string;
      redirectUri?: string;
    },
    meta?: { ip?: string; userAgent?: string }
  ) {
    let googleProfile: {
      email?: string;
      googleId?: string;
      name?: string;
      avatarUrl?: string;
    } = {};

    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    // 1. If authorization code is provided, exchange it for tokens with Google
    if (input.code) {
      try {
        const redirectUri =
          input.redirectUri ||
          process.env.GOOGLE_AUTH_REDIRECT_URI ||
          process.env.GOOGLE_REDIRECT_URI ||
          "https://brandoseye.com/api/oauth/google/callback";

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: input.code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }).toString(),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.id_token) input.idToken = tokenData.id_token;
          if (tokenData.access_token) input.accessToken = tokenData.access_token;
        } else {
          const errText = await tokenRes.text();
          this.logger.warn(`Google OAuth token exchange error: ${errText}`);
        }
      } catch (err: any) {
        this.logger.warn(`Google OAuth code exchange failed: ${err.message}`);
      }
    }

    // 2. Fetch User Profile from Google ID Token
    if (input.idToken) {
      try {
        const tokenRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
            input.idToken
          )}`
        );
        if (tokenRes.ok) {
          const payload = await tokenRes.json();
          googleProfile = {
            email: payload.email?.toLowerCase(),
            googleId: payload.sub,
            name: payload.name,
            avatarUrl: payload.picture,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Failed to verify Google ID token via tokeninfo: ${err.message}`);
      }
    }

    // 3. Fetch User Profile from Google UserInfo API (via Access Token)
    if (!googleProfile.email && input.accessToken) {
      try {
        const userinfoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${input.accessToken}` },
          }
        );
        if (userinfoRes.ok) {
          const payload = await userinfoRes.json();
          googleProfile = {
            email: payload.email?.toLowerCase(),
            googleId: payload.sub,
            name: payload.name,
            avatarUrl: payload.picture,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Failed to fetch Google userinfo: ${err.message}`);
      }
    }

    if (!googleProfile.email) {
      throw new BadRequestException(
        "Could not retrieve Google profile. Please try logging in again."
      );
    }

    const email = googleProfile.email!;
    let isNewUser = false;

    // Check if user exists by Google ID or by Email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleProfile.googleId }, { email: email }],
      },
      include: { memberships: true },
    });

    if (!user) {
      isNewUser = true;
      const businessName = `${googleProfile.name || email.split("@")[0]}'s Business`;
      user = await prisma.user.create({
        data: {
          email,
          emailVerifiedAt: new Date(),
          googleId: googleProfile.googleId,
          name: googleProfile.name ?? null,
          avatarUrl: googleProfile.avatarUrl ?? null,
          authProvider: "GOOGLE",
          status: "ACTIVE",
          twoFactorEnabled: false,
          lastLoginAt: new Date(),
          memberships: {
            create: {
              role: Role.OWNER,
              business: {
                create: {
                  name: businessName,
                  email,
                },
              },
            },
          },
        },
        include: { memberships: true },
      });
    } else {
      if (user.status && user.status !== "ACTIVE") {
        throw new UnauthorizedException(
          `Your account is ${user.status.toLowerCase()}. Please contact support.`
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleProfile.googleId || user.googleId,
          avatarUrl: googleProfile.avatarUrl || user.avatarUrl,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          lastLoginAt: new Date(),
          name: user.name || googleProfile.name,
        },
      });
    }

    const primaryBizId = user.memberships[0]?.businessId;

    await this.activity.log({
      userId: user.id,
      businessId: primaryBizId,
      action: isNewUser ? "AUTH_REGISTER_GOOGLE" : "AUTH_LOGIN_GOOGLE",
      category: "AUTH",
      entityType: "USER",
      entityId: user.id,
      description: `${isNewUser ? "Registered" : "Logged in"} via Google Account (${email})`,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    // Enforce 2FA Step for Google Auth
    return this.initiate2faForUser(user, meta);
  }

  /**
   * 6. Logout
   */
  async logout(
    sessionId: string,
    userId?: string,
    meta?: { ip?: string; userAgent?: string }
  ) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});

    if (userId) {
      const membership = await prisma.membership.findFirst({ where: { userId } });
      await this.activity.log({
        userId,
        businessId: membership?.businessId,
        action: "AUTH_LOGOUT",
        category: "AUTH",
        entityType: "SESSION",
        entityId: sessionId,
        description: "Logged out from system session",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      });
    }
  }

  /**
   * 7. Update User Profile
   */
  async updateProfile(
    userId: string,
    input: { name?: string; email?: string; phone?: string },
    meta?: { ip?: string; userAgent?: string }
  ) {
    const dataToUpdate: any = {};
    if (input.name !== undefined) dataToUpdate.name = input.name.trim();

    if (input.email !== undefined && input.email.trim()) {
      const email = input.email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
      });
      if (existing) {
        throw new BadRequestException("This email address is already in use.");
      }
      dataToUpdate.email = email;
    }

    if (input.phone !== undefined && input.phone.trim()) {
      const phone = input.phone.trim().replace(/[^\d+]/g, "");
      const existing = await prisma.user.findFirst({
        where: { phone, NOT: { id: userId } },
      });
      if (existing) {
        throw new BadRequestException("This phone number is already in use.");
      }
      dataToUpdate.phone = phone;
    }

    await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    const membership = await prisma.membership.findFirst({ where: { userId } });

    await this.activity.log({
      userId,
      businessId: membership?.businessId,
      action: "PROFILE_UPDATED",
      category: "SETTINGS",
      entityType: "USER",
      entityId: userId,
      description: `Updated personal profile details`,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: dataToUpdate,
    });

    return this.getSafeUser(userId);
  }

  /**
   * 8. Change Password
   */
  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string,
    meta?: { ip?: string; userAgent?: string }
  ) {
    if (!newPass || newPass.length < 8) {
      throw new BadRequestException("New password must be at least 8 characters.");
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash) {
      const passwordOk = await bcrypt.compare(currentPass, user.passwordHash);
      if (!passwordOk) {
        throw new BadRequestException("The current password you entered is incorrect.");
      }
    }

    const passwordHash = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    const membership = await prisma.membership.findFirst({ where: { userId } });

    await this.activity.log({
      userId,
      businessId: membership?.businessId,
      action: "PASSWORD_CHANGED",
      category: "SECURITY",
      entityType: "USER",
      entityId: userId,
      description: "Password successfully updated",
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return { success: true, message: "Password updated successfully." };
  }

  private async issueSession(userId: string, ip?: string, userAgent?: string) {
    const token = randomBytes(32).toString("hex");

    await prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        ip: ip || null,
        userAgent: userAgent || null,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    return { token, user: await this.getSafeUser(userId) };
  }

  async getSafeUser(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { memberships: { include: { business: true } } },
    });

    const {
      passwordHash: _ignoredPass,
      twoFactorSecret: _ignoredSecret,
      ...safeUser
    } = user;
    return safeUser;
  }
}