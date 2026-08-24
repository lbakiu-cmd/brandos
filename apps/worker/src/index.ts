import "dotenv/config";
import { Worker } from "bullmq";
import { runWebsiteAudit, runGbpAudit, runSocialAudit } from "./audit-runner";
import { runAiVisibilityReport } from "./ai-visibility-runner";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

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

console.log("⚙️ BrandOS Worker listening on: audit, gbp-audit, social-audit, ai-visibility");