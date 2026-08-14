import "dotenv/config";
import { prisma, Role } from "@brandos/database";
import bcrypt from "bcryptjs";

async function run() {
  console.log("1. Testing Prisma connection...");
  await prisma.$connect();
  console.log("✅ Prisma connected to Postgres!");

  console.log("2. Testing bcrypt password hashing...");
  const hash = await bcrypt.hash("password123", 10);
  console.log("✅ Bcrypt works!");

  console.log("3. Testing database insert (User + Business)...");
  const user = await prisma.user.create({
    data: {
      email: `debug-${Date.now()}@brandos.dev`,
      passwordHash: hash,
      name: "Debug User",
      memberships: {
        create: {
          role: Role.OWNER,
          business: { create: { name: "Debug Business" } }
        }
      }
    }
  });
  console.log("✅ User created successfully! ID:", user.id);
}

run().catch((err) => {
  console.error("\n❌ EXACT ERROR FOUND:");
  console.error(err);
  process.exit(1);
});