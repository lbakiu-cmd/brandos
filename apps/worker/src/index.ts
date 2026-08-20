import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@brandos/database";
import { runWebsiteAudit, runGbpAudit, runSocialAudit } from "./audit-runner";
import { runAiVisibilityReport } from "./ai-visibility-runner";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

async function publishPublication(publicationId: string) {
  const pub = await prisma.postPublication.findUnique({
    where: { id: publicationId },
    include: { post: true, socialAccount: true },
  });
  if (!pub) return;
  if (pub.status === "PUBLISHED") return;

  await prisma.postPublication.update({
    where: { id: publicationId },
    data: { status: "PUBLISHING", attempts: { increment: 1 } },
  });

  await new Promise((r) => setTimeout(r, 700));
  const externalPostId = "fake-post-" + pub.id.slice(0, 8);

  await prisma.postPublication.update({
    where: { id: publicationId },
    data: {
      status: "PUBLISHED",
      externalPostId,
      externalUrl: "https://instagram.com/fake/" + externalPostId,
      publishedAt: new Date(),
    },
  });

  const remaining = await prisma.postPublication.count({
    where: { postId: pub.postId, status: { in: ["PENDING", "PUBLISHING"] } },
  });
  if (remaining === 0) {
    await prisma.post.update({
      where: { id: pub.postId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }
}

const publishWorker = new Worker("publish", async (job) => {
  console.log("⚙️ publish job:", job.id);
  await publishPublication(String(job.data.publicationId));
}, { connection: redisConnection() });

const auditWorker = new Worker("audit", async (job) => {
  console.log("🔍 website audit job:", job.id);
  await runWebsiteAudit(String(job.data.auditId));
}, { connection: redisConnection() });

const gbpWorker = new Worker("gbp-audit", async (job) => {
  console.log("📍 gbp audit job:", job.id);
  await runGbpAudit(String(job.data.gbpAuditId));
}, { connection: redisConnection() });

const socialWorker = new Worker("social-audit", async (job) => {
  console.log("📱 social audit job:", job.id);
  await runSocialAudit(String(job.data.socialAuditId));
}, { connection: redisConnection() });

const aiWorker = new Worker("ai-visibility", async (job) => {
  console.log("🔮 ai-visibility job:", job.id);
  await runAiVisibilityReport(String(job.data.reportId));
}, { connection: redisConnection() });

publishWorker.on("failed", async (job, err) => {
  console.error("❌ publish failed:", job?.id, err.message);
});
auditWorker.on("failed", (job, err) => {
  console.error("❌ website audit failed:", job?.id, err.message);
});
gbpWorker.on("failed", (job, err) => {
  console.error("❌ gbp audit failed:", job?.id, err.message);
});
socialWorker.on("failed", (job, err) => {
  console.error("❌ social audit failed:", job?.id, err.message);
});
aiWorker.on("failed", (job, err) => {
  console.error("❌ ai-visibility failed:", job?.id, err.message);
});

console.log("⚙️ BrandOS Worker listening on: publish, audit, gbp-audit, social-audit, ai-visibility");