import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@brandos/database";

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
  if (pub.status === "PUBLISHED") return; // idempotent: never double-publish

  await prisma.postPublication.update({
    where: { id: publicationId },
    data: { status: "PUBLISHING", attempts: { increment: 1 } },
  });

  // FAKE PROVIDER: simulate network latency + successful platform response
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
    where: {
      postId: pub.postId,
      status: { in: ["PENDING", "PUBLISHING"] },
    },
  });
  if (remaining === 0) {
    await prisma.post.update({
      where: { id: pub.postId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }
}

const worker = new Worker(
  "publish",
  async (job) => {
    console.log("⚙️ Processing publish job:", job.id);
    await publishPublication(String(job.data.publicationId));
    console.log("✅ Published:", job.id);
  },
  {
    connection: redisConnection(),
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
  },
);

worker.on("failed", async (job, err) => {
  console.error("❌ Job failed:", job?.id, err.message);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await prisma.postPublication
      .update({
        where: { id: String(job.data.publicationId) },
        data: { status: "FAILED", error: err.message },
      })
      .catch(() => {});
  }
});

console.log("⚙️ BrandOS Worker listening on queue: publish");