import { prisma } from "@brandos/database";

export async function runAiVisibilityReport(reportId: string, query?: string) {
  const report = await prisma.aiVisibilityReport.findUnique({
    where: { id: reportId },
    include: { business: true },
  });
  if (!report) return;

  // Real report already created synchronously or pending live query
  // No synthetic or mock data is injected
}