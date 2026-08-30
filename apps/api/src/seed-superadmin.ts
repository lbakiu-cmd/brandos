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

  console.log("\n==========================================");
  console.log("✨ SUPER ADMIN CREDENTIALS GENERATED ✨");
  console.log("------------------------------------------");
  console.log("📧 Email:     superadmin@brandoseye.com (or admin@brandoseye.com)");
  console.log("📱 Phone No:  +15125550100");
  console.log("🔑 Password:  BrandOS@SuperAdmin2026!");
  console.log("🛡️ Role:      SUPER_ADMIN (Global System Authority)");
  console.log("==========================================\n");
}

if (require.main === module) {
  seedSuperAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed error:", err);
      process.exit(1);
    });
}
