export interface BusinessContext {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  industry?: string | null;
}

export interface EngineAnswerDetail {
  mentioned: boolean;
  rank: number | null;
  statusLabel: string;
  sentiment: "positive" | "neutral" | "negative" | "absent";
  quote: string;
  competitors: string[];
  sourcesCited: number;
  fullAnswer: string;
}

export interface QuestionItem {
  id: string;
  question: string;
  category:
    | "Seed"
    | "Comparison"
    | "Budget"
    | "Persona"
    | "How to"
    | "Best"
    | "Near me"
    | "Alternative"
    | "Review"
    | "Other";
  gemini?: EngineAnswerDetail;
  googleAi: EngineAnswerDetail;
  chatGpt: EngineAnswerDetail;
}

export interface CompetitorStats {
  name: string;
  mentionsCount: number;
  shareOfVoice: number;
  engines: string[];
  categories: string[];
}

export interface ReferralSource {
  domain: string;
  title: string;
  citationsCount: number;
  category: "Directory" | "Reviews" | "Maps" | "Industry Guide" | "Social";
  status: "linked" | "missing";
}

export interface ContentGapItem {
  topic: string;
  category: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation: string;
  competitorsCovering: string[];
}

export interface VisibilityReportPayload {
  targetQuery: string;
  businessInfo: {
    name: string;
    address: string;
    tags: string[];
    initials: string;
  };
  headline: string;
  subtext: string;
  engineStats: {
    googleAi: {
      name: string;
      percentage: number;
      mentionedCount: number;
      totalCount: number;
    };
    chatGpt: {
      name: string;
      percentage: number;
      mentionedCount: number;
      totalCount: number;
    };
  };
  questions: QuestionItem[];
  competitors: CompetitorStats[];
  referrals: ReferralSource[];
  contentGaps: ContentGapItem[];
}

export function generateVisibilityReport(
  biz: BusinessContext,
  customQuery?: string
): VisibilityReportPayload {
  const name = biz.name || "Your Business";
  const city = biz.city || "";
  const country = biz.country || "";
  const industry = biz.industry || "Services";
  const address = biz.address || (city ? `${city}${country ? `, ${country}` : ""}` : "");

  const query =
    customQuery && customQuery.trim().length > 0
      ? customQuery.trim().replace(/^["']|["']$/g, "")
      : city
      ? `"${name} in ${city}"`
      : `"${name}"`;

  const words = name.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  const tags = city ? [industry, `${industry} in ${city}`] : [industry];

  return {
    targetQuery: query,
    businessInfo: {
      name,
      address,
      tags,
      initials,
    },
    headline: `${name} AI Visibility Report`,
    subtext: `Live AI visibility across Google Gemini & OpenAI ChatGPT.`,
    engineStats: {
      googleAi: {
        name: "Google Gemini",
        percentage: 0,
        mentionedCount: 0,
        totalCount: 0,
      },
      chatGpt: {
        name: "OpenAI ChatGPT",
        percentage: 0,
        mentionedCount: 0,
        totalCount: 0,
      },
    },
    questions: [],
    competitors: [],
    referrals: [],
    contentGaps: [],
  };
}
