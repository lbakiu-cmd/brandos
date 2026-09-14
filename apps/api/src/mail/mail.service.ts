import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailerLiteSubscriber {
  email: string;
  fields?: {
    name?: string;
    last_name?: string;
    company?: string;
    city?: string;
    phone?: string;
  };
  groups?: string[];
  status?: "active" | "unsubscribed" | "unconfirmed" | "bounced" | "junk";
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private mailerLiteApiKey: string = "";

  constructor() {
    this.initTransporter();
    this.initMailerLite();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || "smtp.mailersend.net";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Mail Transporter initialized for ${user} via ${host}:${port}`);
    } else {
      this.logger.warn("SMTP credentials not provided in environment. Direct SMTP will be logged to console in simulated mode.");
    }
  }

  private initMailerLite() {
    this.mailerLiteApiKey = process.env.MAILERLITE_API_KEY || "";
    if (this.mailerLiteApiKey) {
      this.logger.log("MailerLite REST API integration initialized.");
    }
  }

  /**
   * Sync or add user to MailerLite subscriber list
   */
  async syncSubscriberToMailerLite(sub: MailerLiteSubscriber): Promise<boolean> {
    const apiKey = this.mailerLiteApiKey || process.env.MAILERLITE_API_KEY;
    if (!apiKey) {
      this.logger.log(`[SIMULATED MAILERLITE SYNC] ${sub.email}`);
      return true;
    }

    try {
      const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: sub.email,
          fields: sub.fields || {},
          groups: sub.groups || [],
          status: sub.status || "active",
        }),
      });

      if (res.ok) {
        this.logger.log(`Synced subscriber ${sub.email} to MailerLite.`);
        return true;
      } else {
        const err = await res.text();
        this.logger.warn(`MailerLite sync response (${res.status}): ${err}`);
        return false;
      }
    } catch (err: any) {
      this.logger.error(`Failed to sync subscriber to MailerLite: ${err.message}`);
      return false;
    }
  }

  /**
   * Core send email method
   */
  async sendMail(opts: SendMailOptions): Promise<boolean> {
    const from = process.env.SMTP_FROM || `"OnlinePresence Space" <${process.env.SMTP_USER || "noreply@onlinepresence.space"}>`;

    if (!this.transporter) {
      this.logger.log(`[SIMULATED EMAIL] To: ${opts.to} | Subject: ${opts.subject}`);
      return true;
    }

    try {
      const replyTo = process.env.SUPPORT_EMAIL || "support@onlinepresence.space";
      const info = await this.transporter.sendMail({
        from,
        to: opts.to,
        replyTo,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      this.logger.log(`Email dispatched successfully: ${info.messageId} to ${opts.to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${opts.to}: ${err.message}`, err.stack);
      return false;
    }
  }

  /**
   * 1. Welcome Email (also auto-syncs contact to MailerLite)
   */
  async sendWelcomeEmail(to: string, name: string, businessName: string) {
    // Sync contact to MailerLite
    await this.syncSubscriberToMailerLite({
      email: to,
      fields: { name, company: businessName },
      status: "active",
    });

    const subject = `Welcome to AIVisibility SEO, ${name}! 🚀`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
        <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Welcome to AIVisibility SEO</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">Your AI & Search Presence Platform</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">Hi ${name},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
            We're thrilled to have <strong>${businessName}</strong> onboard! AIVisibility SEO will continuously monitor your website, local Google Maps rankings, and AI assistant citations (ChatGPT, Perplexity, Gemini).
          </p>
          <div style="margin: 28px 0; padding: 20px; background-color: #0f172a; border-radius: 12px; border: 1px solid #334155;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #38bdf8;">Your Next Quick Steps:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
              <li>Complete your Business Profile & Opening Hours</li>
              <li>Connect your Google Search Console & Google Maps</li>
              <li>Install the 1-Click WordPress AIVision SEO Plugin</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL || "https://icandothat.online"}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
              Open Growth Dashboard →
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px;">
            Need help? Reply directly to this email or reach us at <a href="mailto:${process.env.SUPPORT_EMAIL || "support@onlinepresence.space"}" style="color: #38bdf8;">${process.env.SUPPORT_EMAIL || "support@onlinepresence.space"}</a>.
          </p>
        </div>
      </div>
    `;
    return this.sendMail({ to, subject, html });
  }

  /**
   * 2. Password Reset
   */
  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const subject = "Reset your AIVisibility SEO password";
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; background-color: #020617; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; padding: 32px;">
        <h2 style="color: #ffffff; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password for AIVisibility SEO. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">
          If you did not request this, you can safely ignore this email. Link expires in 60 minutes.
        </p>
      </div>
    `;
    return this.sendMail({ to, subject, html });
  }

  /**
   * 3. Website Audit & Checkup Completed Alert
   */
  async sendAuditAlertEmail(to: string, businessName: string, score: number, url: string) {
    const subject = `📊 Website Checkup Ready for ${businessName} (${score}/100)`;
    const scoreColor = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; padding: 32px;">
        <h2 style="color: #ffffff; margin-top: 0;">Website Health Checkup Complete</h2>
        <p style="color: #94a3b8; font-size: 14px;">
          We just finished scanning <strong>${url}</strong> for <strong>${businessName}</strong>.
        </p>
        <div style="text-align: center; padding: 24px; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; margin: 24px 0;">
          <span style="font-size: 48px; font-weight: 900; color: ${scoreColor};">${score}</span>
          <span style="color: #64748b; font-size: 18px;"> / 100</span>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">Overall Online Growth & Search Grade</p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${process.env.FRONTEND_URL || "https://icandothat.online"}/dashboard/audit" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            View Detailed Findings & 1-Click Fixes →
          </a>
        </div>
      </div>
    `;
    return this.sendMail({ to, subject, html });
  }

  /**
   * 4. Weekly Online Growth Digest
   */
  async sendWeeklyGrowthDigest(
    to: string,
    businessName: string,
    stats: { clicks: number; impressions: number; aiVisitors: number; phoneCalls: number }
  ) {
    const subject = `📈 Weekly Growth Digest for ${businessName}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
        <div style="background: #1e293b; padding: 24px 32px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Your Weekly Growth Summary</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">${businessName}</p>
        </div>
        <div style="padding: 32px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: #0f172a; padding: 16px; border-radius: 10px; border: 1px solid #334155;">
              <span style="color: #94a3b8; font-size: 11px;">Google Search Clicks</span>
              <p style="color: #38bdf8; font-size: 24px; font-weight: 800; margin: 4px 0 0 0;">${stats.clicks.toLocaleString()}</p>
            </div>
            <div style="background: #0f172a; padding: 16px; border-radius: 10px; border: 1px solid #334155;">
              <span style="color: #94a3b8; font-size: 11px;">Search Impressions</span>
              <p style="color: #a855f7; font-size: 24px; font-weight: 800; margin: 4px 0 0 0;">${stats.impressions.toLocaleString()}</p>
            </div>
            <div style="background: #0f172a; padding: 16px; border-radius: 10px; border: 1px solid #334155;">
              <span style="color: #94a3b8; font-size: 11px;">AI Chatbot Referrals</span>
              <p style="color: #10b981; font-size: 24px; font-weight: 800; margin: 4px 0 0 0;">${stats.aiVisitors.toLocaleString()}</p>
            </div>
            <div style="background: #0f172a; padding: 16px; border-radius: 10px; border: 1px solid #334155;">
              <span style="color: #94a3b8; font-size: 11px;">Google Maps Calls</span>
              <p style="color: #f59e0b; font-size: 24px; font-weight: 800; margin: 4px 0 0 0;">${stats.phoneCalls.toLocaleString()}</p>
            </div>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.FRONTEND_URL || "https://icandothat.online"}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
              Open Full Dashboard →
            </a>
          </div>
        </div>
      </div>
    `;
    return this.sendMail({ to, subject, html });
  }

  /**
   * 5. Two-Week Online Presence Milestone & Comparison Reminder
   */
  async sendTwoWeekComparisonReminder(
    to: string,
    name: string,
    businessName: string,
    initialScore: number,
    currentScore: number,
    resolvedCount: number = 0,
    comparisonUrl: string = `${process.env.FRONTEND_URL || "https://icandothat.online"}/dashboard`
  ) {
    const delta = currentScore - initialScore;
    const deltaPrefix = delta > 0 ? `+${delta}` : `${delta}`;
    const deltaColor = delta >= 0 ? "#10b981" : "#ef4444";
    const subject = `🎉 2-Week Milestone: See how ${businessName}'s Online Presence Grew (${initialScore} ➔ ${currentScore})`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e1b4b, #2563eb); padding: 32px; text-align: center;">
          <div style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.15); border-radius: 999px; font-size: 12px; font-weight: 700; color: #e0e7ff; margin-bottom: 12px;">
            🏆 14-DAY GROWTH MILESTONE
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Your 2-Week Comparison Is Ready</h1>
          <p style="color: #cbd5e1; margin: 8px 0 0 0; font-size: 14px;">Baseline vs Today's Online Presence for ${businessName}</p>
        </div>
        <div style="padding: 32px;">
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">Hi ${name},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
            It's been two weeks since you registered <strong>${businessName}</strong> on AIVisibility SEO. We recorded your initial baseline snapshot on Day 1, and your online presence metrics have evolved!
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
            <div style="background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #334155; text-align: center;">
              <span style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Day 1 Baseline</span>
              <p style="font-size: 36px; font-weight: 900; color: #94a3b8; margin: 8px 0 0 0;">${initialScore}<span style="font-size: 14px; font-weight: 400; color: #64748b;"> /100</span></p>
            </div>
            <div style="background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #2563eb; text-align: center; position: relative;">
              <span style="color: #38bdf8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Current Presence</span>
              <p style="font-size: 36px; font-weight: 900; color: ${deltaColor}; margin: 8px 0 0 0;">${currentScore}<span style="font-size: 14px; font-weight: 400; color: #64748b;"> /100</span></p>
              <span style="display: inline-block; margin-top: 4px; font-size: 12px; font-weight: 700; color: ${deltaColor}; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 6px;">
                ${deltaPrefix} pts Change
              </span>
            </div>
          </div>

          ${
            resolvedCount > 0
              ? `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #34d399;">
              ✅ <strong>${resolvedCount} optimization issues resolved</strong> since Day 1 (including Schema structured data & AI visibility improvements).
            </p>
          </div>
          `
              : ""
          }

          <div style="text-align: center; margin: 28px 0;">
            <a href="${comparisonUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
              View Full Side-by-Side Comparison →
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #1e293b; padding-top: 16px;">
            Want to run a new deep audit? Access your <a href="${process.env.FRONTEND_URL || "https://icandothat.online"}/dashboard/audit" style="color: #38bdf8;">Website Health Checkup</a> at any time.
          </p>
        </div>
      </div>
    `;
    return this.sendMail({ to, subject, html });
  }
}
