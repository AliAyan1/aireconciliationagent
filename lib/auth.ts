import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthRole, AuthUser } from "./auth-types";
import { SESSION_COOKIE, verifyAuthToken } from "./auth-token";

export {
  SESSION_COOKIE,
  sessionCookieOptions,
  signAuthToken,
  verifyAuthToken,
} from "./auth-token";

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  if (!payload) return null;
  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}

export {
  homePathForRole,
  parseAuthRole,
  parseLoginIntent,
  pathAllowedForRole,
  resolvePostLoginPath,
  type LoginIntent,
} from "./auth-routes";

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();
  return user;
}

export async function requireRole(
  role: AuthRole
): Promise<AuthUser | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.role !== role) return forbiddenResponse();
  return result;
}

export async function requireTeam(): Promise<AuthUser | NextResponse> {
  return requireRole("TEAM");
}

export async function requireAdmin(): Promise<AuthUser | NextResponse> {
  return requireRole("ADMIN");
}

export function isAuthError(
  value: AuthUser | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
