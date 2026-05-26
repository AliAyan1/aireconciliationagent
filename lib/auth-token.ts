import { SignJWT, jwtVerify } from "jose";
import type { AuthRole, AuthTokenPayload, AuthUser } from "./auth-types";

export const SESSION_COOKIE = "hisaabai-session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    (process.env.NODE_ENV === "development"
      ? "dev-only-change-me-in-production"
      : "");
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET must be set in .env.local (at least 16 characters)"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecret());
}

export async function verifyAuthToken(
  token: string
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const role = payload.role;
    if (
      typeof sub !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      (role !== "TEAM" && role !== "ADMIN")
    ) {
      return null;
    }
    return { sub, id: sub, email, name, role };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export type { AuthRole, AuthUser };
