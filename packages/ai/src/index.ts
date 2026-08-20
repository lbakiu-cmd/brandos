export type SupportedAiEngine =
  | "CHATGPT"
  | "GEMINI"
  | "CLAUDE"
  | "PERPLEXITY"
  | "GOOGLE_AI_OVERVIEW"
  | "BING_COPILOT";

export interface AiEngineQuery {
  businessName: string;
  city: string;
  industry: string;
}

export interface AiEngineResult {
  engine: string;
  mentioned: boolean;
  rank: number | null;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "ABSENT";
  quote: string;
  source: "live" | "mock";
}

export function buildVisibilityPrompt(q: AiEngineQuery): string {
  return (
    `I am researching ${q.industry} options in ${q.city}. ` +
    `Do you know "${q.businessName}"? ` +
    `List your top recommendations as a numbered list, and include anything you know about "${q.businessName}".`
  );
}

export function parseSentiment(raw: string): "POSITIVE" | "NEUTRAL" | "NEGATIVE" {
  const lower = raw.toLowerCase();
  const posKeywords = ["recommend", "well-regarded", "excellent", "great", "good", "trusted", "professional", "highly", "top-rated"];
  const negKeywords = ["avoid", "complaint", "bad", "poor", "scam", "worst", "negative", "disappointing"];
  
  const pos = posKeywords.filter((w) => lower.includes(w)).length;
  const neg = negKeywords.filter((w) => lower.includes(w)).length;
  
  if (pos > neg) return "POSITIVE";
  if (neg > pos) return "NEGATIVE";
  return "NEUTRAL";
}
