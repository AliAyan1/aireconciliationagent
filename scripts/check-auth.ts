import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("No DATABASE_URL");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true, passwordHash: true },
  });
  console.log("Users in DB:", users.length);
  for (const u of users) {
    const teamOk = await bcrypt.compare("team12345", u.passwordHash);
    const adminOk = await bcrypt.compare("admin12345", u.passwordHash);
    console.log(`  ${u.email} (${u.role}) team12345=${teamOk} admin12345=${adminOk}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
