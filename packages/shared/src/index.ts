export const BRAND_NAME = "BrandOS";
export const BRAND_TAGLINE = "AI Visibility Operating System";

export const SCORE_LEVELS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
} as const;

export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-slate-500";
  if (score >= SCORE_LEVELS.EXCELLENT) return "text-emerald-400";
  if (score >= SCORE_LEVELS.FAIR) return "text-amber-400";
  return "text-rose-400";
}
