import { prisma } from "@brandos/database";
import { queryEngine, EngineResult } from "./engines";

const ENGINES = ["CHATGPT", "GEMINI", "CLAUDE", "PERPLEXITY", "GOOGLE_AI_OVERVIEW", "BING_COPILOT"];

export async function runAiVisibilityReport(reportId: string) {
  const report = await prisma.aiVisibilityReport.findUnique({
    where: { id: reportId },
    include: { business: true },
  });
  if (!report) return;

  const business = report.business;
  const q = {
    businessName: business.name,
    city: business.city ?? "your area",
    industry: business.industry ?? "local business",
  };

  const results: EngineResult[] = [];
  for (const engine of ENGINES) {
    results.push(await queryEngine(engine, q));
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