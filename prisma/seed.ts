import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Admins can't sign up through the UI, so they are created here.
async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.log(`Seeded admin: ${email}`);
}

main().finally(() => prisma.$disconnect());
