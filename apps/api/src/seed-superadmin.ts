import "dotenv/config";
import { prisma, Role } from "@brandos/database";
import * as bcrypt from "bcryptjs";

export async function seedSuperAdmin() {
  console.log("⚡ Seeding / Verifying Super Admin user in database...");
  await prisma.$connect();

  const superAdminEmail = "superadmin@brandoseye.com";
  const superAdminPhone = "+15125550100";
  const rawPassword = "BrandOS@SuperAdmin2026!";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Ensure Primary Master Business Workspace exists
  let masterBiz = await prisma.business.findFirst({
    where: { name: "BrandOS Global Headquarters" },
  });

  if (!masterBiz) {
    masterBiz = await prisma.business.create({
      data: {
        name: "BrandOS Global Headquarters",
        website: "https://brandoseye.com",
        industry: "Enterprise AI & Growth Tech",
        city: "Austin, TX",
        phone: "+1 (512) 555-0100",
        email: "superadmin@brandoseye.com",
        subscriptionTier: "AGENCY",
      },
    });
    console.log("🏢 Created Master Business Workspace:", masterBiz.id);
  }

  // 2. Upsert Super Admin User
  let superAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email: superAdminEmail }, { phone: superAdminPhone }],
    },
  });

  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        phone: superAdminPhone,
        name: "Super Administrator",
        passwordHash,
        isSuperAdmin: true,
        authProvider: "EMAIL",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        memberships: {
          create: {
            businessId: masterBiz.id,
            role: Role.SUPER_ADMIN,
          },
        },
      },
    });
    console.log("👑 Created Super Admin User:", superAdmin.email, "ID:", superAdmin.id);
  } else {
    superAdmin = await prisma.user.update({
      where: { id: superAdmin.id },
      data: {
        email: superAdminEmail,
        phone: superAdminPhone,
        name: "Super Administrator",
        passwordHash,
        isSuperAdmin: true,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });

    // Ensure SUPER_ADMIN membership
    const membership = await prisma.membership.findFirst({
      where: { userId: superAdmin.id, businessId: masterBiz.id },
    });

    if (!membership) {
      await prisma.membership.create({
        data: {
          userId: superAdmin.id,
          businessId: masterBiz.id,
          role: Role.SUPER_ADMIN,
        },
      });
    } else {
      await prisma.membership.update({
        where: { id: membership.id },
        data: { role: Role.SUPER_ADMIN },
      });
    }
    console.log("👑 Updated Super Admin User credentials and SUPER_ADMIN role!");
  }

  // Also update default fallback user if exists
  const defaultAdmin = await prisma.user.findUnique({
    where: { email: "admin@brandoseye.com" },
  });
  if (defaultAdmin) {
    await prisma.user.update({
      where: { id: defaultAdmin.id },
      data: {
        passwordHash,
        isSuperAdmin: true,
      },
    });
    await prisma.membership.updateMany({
      where: { userId: defaultAdmin.id },
      data: { role: Role.SUPER_ADMIN },
    });
  }

  // 3. Purge all simulations from all accounts across any module
  await purgeAllSimulations();

  console.log("\n==========================================");
  console.log("✨ SUPER ADMIN CREDENTIALS GENERATED ✨");
  console.log("------------------------------------------");
  console.log("📧 Email:     superadmin@brandoseye.com (or admin@brandoseye.com)");
  console.log("📱 Phone No:  +15125550100");
  console.log("🔑 Password:  BrandOS@SuperAdmin2026!");
  console.log("🛡️ Role:      SUPER_ADMIN (Global System Authority)");
  console.log("==========================================\n");
}

export async function purgeAllSimulations() {
  console.log("🧹 Running global database simulation cleanup across all accounts...");

  const fakeAuthors = [
    "Sarah Jenkins",
    "Michael Rodriguez",
    "David Chen",
    "Emily Watson",
    "Alex Vance",
    "Alex P.",
    "Maria G.",
    "Chris D.",
    "Michael T.",
    "Sarah W.",
    "Robert H.",
    "Jessica M.",
    "Chef Anthony",
    "Daniel B.",
    "George P.",
    "Linda K.",
    "Marcus S.",
    "Emily R.",
    "James & Karen",
    "Peter V.",
    "Elena R.",
    "Marcus V.",
    "Sarah K.",
  ];

  try {
    // 1. Delete all fake Google reviews
    const deletedReviews = await prisma.googleReview.deleteMany({
      where: {
        OR: [
          { authorName: { in: fakeAuthors } },
          { id: { startsWith: "rev_" } },
          { comment: { contains: "Amazing service at" } },
          { comment: { contains: "Super transparent pricing" } },
          { comment: { contains: "Wait time was about 15 minutes past" } },
          { comment: { contains: "Had trouble getting in touch with someone" } },
          { comment: { contains: "Best service provider in" } },
        ],
      },
    });
    console.log(`  🗑️ Purged ${deletedReviews.count} simulated Google review records.`);

    // 2. Delete mock integration accounts or reset mock metrics caches
    const deletedMockIntegrations = await prisma.integrationAccount.deleteMany({
      where: {
        accessTokenEnc: "mock_access_token",
      },
    });
    console.log(`  🗑️ Purged ${deletedMockIntegrations.count} mock integration accounts.`);

    // 3. Clear simulated metricsCache from any remaining accounts
    const accountsWithCache = await prisma.integrationAccount.findMany({
      where: { metricsCache: { not: null as any } },
    });
    let clearedCacheCount = 0;
    for (const acc of accountsWithCache) {
      const cacheStr = JSON.stringify(acc.metricsCache || {});
      if (
        cacheStr.includes("rev_") ||
        cacheStr.includes("Alex P.") ||
        cacheStr.includes("Maria G.") ||
        cacheStr.includes("Simulated") ||
        cacheStr.includes("Interactive GSC Demo Mode")
      ) {
        await prisma.integrationAccount.update({
          where: { id: acc.id },
          data: { metricsCache: null as any },
        });
        clearedCacheCount++;
      }
    }
    console.log(`  🗑️ Cleared simulated metricsCache from ${clearedCacheCount} integration accounts.`);

    // 4. Delete simulated competitor mentions
    const deletedMentions = await prisma.competitorMention.deleteMany({
      where: {
        prompt: { startsWith: "Top rated" },
      },
    });
    console.log(`  🗑️ Purged ${deletedMentions.count} simulated competitor mention records.`);

    console.log("✅ All simulated records purged successfully across all accounts.");
  } catch (err: any) {
    console.warn("⚠️ Note during simulation purge:", err.message);
  }
}

if (require.main === module) {
  seedSuperAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed error:", err);
      process.exit(1);
    });
}
