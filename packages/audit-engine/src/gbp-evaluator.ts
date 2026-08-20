export interface GbpAuditInput {
  businessName: string;
  category?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  reviewCount?: number;
  rating?: number;
  responseRatePercent?: number;
  photoCount?: number;
  hasHours?: boolean;
  isVerified?: boolean;
}

export interface GbpCheck {
  pillar: "PROFILE_COMPLETENESS" | "REVIEWS_REPUTATION" | "VISUALS_MEDIA" | "ENGAGEMENT";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  recommendation: string;
  passed: boolean;
  score: number;
  maxScore: number;
  fixType?: "GBP_HOURS" | "GBP_REVIEWS" | "GBP_PHOTOS" | "GBP_CATEGORIES";
}

export function evaluateGoogleBusinessProfile(input: GbpAuditInput): {
  score: number;
  metrics: {
    completenessScore: number;
    reputationScore: number;
    mediaScore: number;
    engagementScore: number;
    reviewCount: number;
    rating: number;
  };
  checks: GbpCheck[];
} {
  const checks: GbpCheck[] = [];

  const add = (
    pillar: GbpCheck["pillar"],
    severity: GbpCheck["severity"],
    title: string,
    passed: boolean,
    score: number,
    maxScore: number,
    recommendation: string,
    description: string,
    fixType?: GbpCheck["fixType"]
  ) => {
    checks.push({
      pillar,
      severity,
      title,
      passed,
      score: passed ? score : Math.round(score * 0.2),
      maxScore,
      recommendation,
      description,
      fixType,
    });
  };

  // 1. Profile Completeness
  const hasCategory = Boolean(input.category && input.category.length > 2);
  add(
    "PROFILE_COMPLETENESS",
    "CRITICAL",
    "Primary & Secondary Business Categories",
    hasCategory,
    25,
    25,
    "Set a precise primary category (e.g., 'Italian Restaurant') plus 3-5 secondary categories.",
    "Category selection is the #1 ranking factor for Google Maps and local AI search.",
    "GBP_CATEGORIES"
  );

  const hasHours = input.hasHours ?? true;
  add(
    "PROFILE_COMPLETENESS",
    "HIGH",
    "Weekly Operating Hours & Special Schedules",
    hasHours,
    15,
    15,
    "Update your regular opening hours and special holiday hours in Google Business Profile.",
    "Unlisted or outdated hours cause Google to drop your business when users search 'open now'.",
    "GBP_HOURS"
  );

  const hasNAP = Boolean(input.phone && input.website && input.city);
  add(
    "PROFILE_COMPLETENESS",
    "HIGH",
    "Complete Contact Information (Phone, Website, City)",
    hasNAP,
    15,
    15,
    "Ensure your exact phone number, official website URL, and address match your website exactly.",
    "Inconsistent contact data splits authority across Google Maps and Apple Maps."
  );

  // 2. Reviews & Reputation
  const reviewCount = input.reviewCount ?? 18;
  const rating = input.rating ?? 4.7;
  const hasStrongReviews = reviewCount >= 20 && rating >= 4.3;

  add(
    "REVIEWS_REPUTATION",
    "HIGH",
    "Google Review Volume & Rating (20+ reviews, 4.3+ stars)",
    hasStrongReviews,
    20,
    20,
    `Increase your Google review count (currently ${reviewCount} reviews, ${rating}★) using automated review request workflows.`,
    "AI assistants actively filter for businesses with strong recent review velocity.",
    "GBP_REVIEWS"
  );

  const responseRate = input.responseRatePercent ?? 85;
  const hasHighResponseRate = responseRate >= 80;
  add(
    "REVIEWS_REPUTATION",
    "MEDIUM",
    "Review Response Rate (80%+ target)",
    hasHighResponseRate,
    10,
    10,
    `Respond to 100% of reviews within 48 hours (currently ~${responseRate}% response rate).`,
    "Responding to positive and critical reviews signals active ownership to Google's ranking algorithms.",
    "GBP_REVIEWS"
  );

  // 3. Media & Visuals
  const photoCount = input.photoCount ?? 14;
  const hasGoodPhotos = photoCount >= 10;
  add(
    "VISUALS_MEDIA",
    "MEDIUM",
    "High-Resolution Photos & Video Presence (10+ photos)",
    hasGoodPhotos,
    15,
    15,
    `Upload high-quality interior, exterior, team, and product photos (currently ${photoCount} photos).`,
    "Listings with 100+ photos receive 520% more calls and 1,065% more website clicks.",
    "GBP_PHOTOS"
  );

  const totalMax = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const totalEarned = checks.reduce((sum, c) => sum + c.score, 0);
  const score = Math.round((totalEarned / (totalMax || 1)) * 100);

  const completenessChecks = checks.filter((c) => c.pillar === "PROFILE_COMPLETENESS");
  const reputationChecks = checks.filter((c) => c.pillar === "REVIEWS_REPUTATION");
  const mediaChecks = checks.filter((c) => c.pillar === "VISUALS_MEDIA");

  const calcPillarScore = (list: GbpCheck[]) => {
    const max = list.reduce((s, i) => s + i.maxScore, 0);
    const earned = list.reduce((s, i) => s + i.score, 0);
    return Math.round((earned / (max || 1)) * 100);
  };

  return {
    score,
    metrics: {
      completenessScore: calcPillarScore(completenessChecks),
      reputationScore: calcPillarScore(reputationChecks),
      mediaScore: calcPillarScore(mediaChecks),
      engagementScore: hasHighResponseRate ? 90 : 60,
      reviewCount,
      rating,
    },
    checks,
  };
}
