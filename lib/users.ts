import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { normalizeLoginEmail } from "./demo-accounts";
import { prisma } from "./db";
import { isDatabaseConfigured } from "./db";
import type { AuthUser } from "./auth-types";

export async function findUserByEmail(email: string) {
  if (!isDatabaseConfigured()) return null;
  return prisma.user.findUnique({
    where: { email: normalizeLoginEmail(email) },
  });
}

export async function verifyUserPassword(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password.trim(), user.passwordHash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      email: data.email.trim().toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
    },
  });
}
