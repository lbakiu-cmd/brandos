import { prisma } from "@brandos/database";

type EngineResult = {
  engine: string;
  mentioned: boolean;
  rank: number | null;
  sentiment: string;
  quote: string;
};

const ENGINES = ["CHATGPT", "GEMINI", "CLAUDE", "PERPLEXITY", "GOOGLE_AI_OVERVIEW", "BING_COPILOT"];

// PROVIDER ABSTRACTION:
// When you have API keys, replace the mock body with real calls:
//   CHATGPT    -> OPENAI_API_KEY
//   GEMINI     -> GEMINI_API_KEY
//   CLAUDE     -> ANTHROPIC_API_KEY
//   PERPLEXITY -> PERPLEXITY_API_KEY
async function queryEngine(
  engine: string,
  businessName: string,
  city: string,
  industry: string,
): Promise<EngineResult> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

  const seed = (engine + businessName)
    .split("")
    .reduce((s, ch) => s + ch.charCodeAt(0), 0);

  const mentioned = seed % 10 < 6;
  const rank = mentioned ? (seed % 3) + 1 : null;
  const sentiment = mentioned ? (seed % 5 === 0 ? "NEUTRAL" : "POSITIVE") : "ABSENT";
  const quote = mentioned
    ? businessName + " is a well-regarded " + industry + " provider in " + city + ". Customers frequently mention professional service."
    : "I don't have specific information about " + businessName + " in " + city + ". Consider checking local directories.";

  return { engine, mentioned, rank, sentiment, quote };
}

export async function runAiVisibilityReport(reportId: string) {
  const report = await prisma.aiVisibilityReport.findUnique({
    where: { id: reportId },
    include: { business: true },
  });
  if (!report) return;

  const business = report.business;
  const city = business.city ?? "your area";
  const industry = business.industry ?? "local business";

  const results: EngineResult[] = [];
  for (const engine of ENGINES) {
    results.push(await queryEngine(engine, business.name, city, industry));
  }

  const mentionedCount = results.filter((r) => r.mentioned).length;
  const overall = Math.round((mentionedCount / results.length) * 100);

  const engineScores: Record<string, number> = {};
  for (const r of results) {
    engineScores[r.engine] = r.mentioned
      ? r.rank === 1 ? 100 : r.rank === 2 ? 80 : r.rank === 3 ? 60 : 50
      : 0;
  }

  await prisma.aiVisibilityReport.update({
    where: { id: reportId },
    data: {
      overallScore: overall,
      engineScores,
      mentions: results,
      promptsRun: results.length,
    },
  });
}