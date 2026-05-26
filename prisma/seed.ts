import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

config({ path: ".env" });
config({ path: ".env.local", override: true });
async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed users");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const users = [
    {
      email: "team@hisaabai.local",
      password: "team12345",
      name: "HisaabAI Team",
      role: "TEAM" as const,
    },
    {
      email: "admin@hisaabai.local",
      password: "admin12345",
      name: "HisaabAI Admin",
      role: "ADMIN" as const,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        name: u.name,
        role: u.role,
      },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
      },
    });
    console.log(`Seeded ${u.role} user: ${u.email}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
