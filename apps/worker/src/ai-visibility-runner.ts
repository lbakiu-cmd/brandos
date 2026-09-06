import { prisma } from "@brandos/database";
import { generateVisibilityReport } from "./visibility-report-generator";

export async function runAiVisibilityReport(reportId: string, query?: string) {
  const report = await prisma.aiVisibilityReport.findUnique({
    where: { id: reportId },
    include: { business: true },
  });
  if (!report) return;

  const business = report.business;
  const payload = generateVisibilityReport(
    {
      id: business.id,
      name: business.name,
      city: business.city,
      country: business.country,
      industry: business.industry,
    },
    query
  );

  const googleScore = payload.engineStats.googleAi.percentage;
  const chatGptScore = payload.engineStats.chatGpt.percentage;
  const overall = Math.round((googleScore + chatGptScore) / 2);

  await prisma.aiVisibilityReport.update({
    where: { id: reportId },
    data: {
      overallScore: overall,
      engineScores: {
        GOOGLE_AI_OVERVIEW: googleScore,
        CHATGPT: chatGptScore,
      },
      mentions: payload as any,
      promptsRun: payload.questions.length * 2,
    },
  });
}