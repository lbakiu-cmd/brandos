export interface SocialAuditInput {
  connectedPlatforms: string[];
  recentPostCount?: number;
  scheduledPostCount?: number;
  hasLinkInBio?: boolean;
  hasBioKeywords?: boolean;
  inboxActive?: boolean;
}

export interface SocialCheck {
  pillar: "CHANNEL_COVERAGE" | "CONTENT_CADENCE" | "BIO_OPTIMIZATION" | "CONVERSATIONAL_INBOX";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  recommendation: string;
  passed: boolean;
  score: number;
  maxScore: number;
  fixType?: "SOCIAL_SCHEDULE" | "SOCIAL_BIO" | "CONNECT_CHANNELS";
}

export function evaluateSocialPresence(input: SocialAuditInput): {
  score: number;
  metrics: {
    channelCoverageScore: number;
    cadenceScore: number;
    bioScore: number;
    inboxScore: number;
    platformCount: number;
  };
  checks: SocialCheck[];
} {
  const checks: SocialCheck[] = [];

  const add = (
    pillar: SocialCheck["pillar"],
    severity: SocialCheck["severity"],
    title: string,
    passed: boolean,
    score: number,
    maxScore: number,
    recommendation: string,
    description: string,
    fixType?: SocialCheck["fixType"]
  ) => {
    checks.push({
      pillar,
      severity,
      title,
      passed,
      score: passed ? score : Math.round(score * 0.15),
      maxScore,
      recommendation,
      description,
      fixType,
    });
  };

  // 1. Channel Coverage
  const count = input.connectedPlatforms.length;
  const hasCoreChannels = count >= 2;
  add(
    "CHANNEL_COVERAGE",
    "HIGH",
    "Multi-Platform Social Footprint (2+ active channels)",
    hasCoreChannels,
    30,
    30,
    `Connect additional social profiles (currently ${count} connected). Instagram, Facebook, and LinkedIn are core.`,
    "AI engines index brand entities across multiple social graphs to verify legitimacy and relevance.",
    "CONNECT_CHANNELS"
  );

  // 2. Content Cadence & Publishing
  const scheduled = input.scheduledPostCount ?? 0;
  const publishedRecent = input.recentPostCount ?? 1;
  const isPublishingActive = publishedRecent > 0 || scheduled > 0;
  add(
    "CONTENT_CADENCE",
    "HIGH",
    "Active Publishing & Social Scheduling Queue",
    isPublishingActive,
    30,
    30,
    "Maintain an active scheduled posting cadence using the Content Studio.",
    "Regular, topical content updates signal fresh authority to search engines and AI knowledge graphs.",
    "SOCIAL_SCHEDULE"
  );

  // 3. Bio & Profile Optimization
  const hasLinkInBio = input.hasLinkInBio ?? true;
  add(
    "BIO_OPTIMIZATION",
    "MEDIUM",
    "Bio Link & Website Routing",
    hasLinkInBio,
    20,
    20,
    "Ensure all social profile bios link directly to your official website or high-converting landing page.",
    "Direct backlink authority connects social entities with your primary domain in Google's Knowledge Graph.",
    "SOCIAL_BIO"
  );

  // 4. Conversational Inbox
  const isInboxActive = input.inboxActive ?? true;
  add(
    "CONVERSATIONAL_INBOX",
    "MEDIUM",
    "Real-time Direct Message & Inbox Integration",
    isInboxActive,
    20,
    20,
    "Route customer direct messages into the BrandOS Unified Inbox for rapid reply turnaround.",
    "Fast social response times increase customer conversion and lower churn.",
    "CONNECT_CHANNELS"
  );

  const totalMax = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const totalEarned = checks.reduce((sum, c) => sum + c.score, 0);
  const score = Math.round((totalEarned / (totalMax || 1)) * 100);

  return {
    score,
    metrics: {
      channelCoverageScore: hasCoreChannels ? 90 : count > 0 ? 50 : 20,
      cadenceScore: isPublishingActive ? 85 : 30,
      bioScore: hasLinkInBio ? 95 : 40,
      inboxScore: isInboxActive ? 100 : 40,
      platformCount: count,
    },
    checks,
  };
}
