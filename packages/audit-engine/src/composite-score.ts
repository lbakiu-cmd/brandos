export interface ChannelScores {
  websiteScore: number | null;
  gbpScore: number | null;
  aiVisibilityScore: number | null;
  socialScore: number | null;
}

export type ScoreGrade = "A+" | "A" | "B" | "C" | "D" | "NEEDS_ACTION";

export interface BrandOsScoreSummary {
  overallScore: number;
  grade: ScoreGrade;
  gradeLabel: string;
  gradeColor: string;
  pillars: {
    website: { score: number; weightPercent: number; status: string };
    gbp: { score: number; weightPercent: number; status: string };
    aiVisibility: { score: number; weightPercent: number; status: string };
    social: { score: number; weightPercent: number; status: string };
  };
}

export function calculateCompositeBrandScore(input: ChannelScores): BrandOsScoreSummary {
  const website = input.websiteScore ?? 0;
  const gbp = input.gbpScore ?? 0;
  const ai = input.aiVisibilityScore ?? 0;
  const social = input.socialScore ?? 0;

  // Weighted formula: Website (30%) + GBP (25%) + AI (25%) + Social (20%)
  const overallScore = Math.round(
    website * 0.30 +
    gbp * 0.25 +
    ai * 0.25 +
    social * 0.20
  );

  let grade: ScoreGrade = "NEEDS_ACTION";
  let gradeLabel = "Critical Attention Needed";
  let gradeColor = "text-rose-500";

  if (overallScore >= 90) {
    grade = "A+";
    gradeLabel = "Industry Leader";
    gradeColor = "text-emerald-400";
  } else if (overallScore >= 80) {
    grade = "A";
    gradeLabel = "Strong AI & Search Presence";
    gradeColor = "text-emerald-400";
  } else if (overallScore >= 65) {
    grade = "B";
    gradeLabel = "Good Foundation, Gaps to Fix";
    gradeColor = "text-blue-400";
  } else if (overallScore >= 50) {
    grade = "C";
    gradeLabel = "Average Visibility";
    gradeColor = "text-amber-400";
  } else if (overallScore >= 35) {
    grade = "D";
    gradeLabel = "Low AI Discoverability";
    gradeColor = "text-orange-500";
  }

  const getStatus = (s: number) =>
    s >= 75 ? "EXCELLENT" : s >= 50 ? "FAIR" : "CRITICAL";

  return {
    overallScore,
    grade,
    gradeLabel,
    gradeColor,
    pillars: {
      website: { score: website, weightPercent: 30, status: getStatus(website) },
      gbp: { score: gbp, weightPercent: 25, status: getStatus(gbp) },
      aiVisibility: { score: ai, weightPercent: 25, status: getStatus(ai) },
      social: { score: social, weightPercent: 20, status: getStatus(social) },
    },
  };
}
