import type { AuthRole } from "./auth-types";

export function homePathForRole(role: AuthRole): string {
  return role === "ADMIN" ? "/admin" : "/upload";
}

const TEAM_PATH_PREFIXES = ["/upload", "/dashboard", "/history"] as const;

export function pathAllowedForRole(path: string, role: AuthRole): boolean {
  if (role === "ADMIN") {
    return path === "/admin" || path.startsWith("/admin/");
  }
  return TEAM_PATH_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}

/** Pick redirect after login; never send a user to a route their role cannot use. */
export function resolvePostLoginPath(
  role: AuthRole,
  fallback: string,
  next: string | null | undefined
): string {
  const home = homePathForRole(role);
  const base = fallback || home;
  if (!next || !next.startsWith("/") || next.includes("//")) {
    return base;
  }
  return pathAllowedForRole(next, role) ? next : home;
}

export function parseAuthRole(value: unknown): AuthRole {
  return value === "ADMIN" ? "ADMIN" : "TEAM";
}

export type LoginIntent = "team" | "admin";

export function parseLoginIntent(
  value: string | null | undefined
): LoginIntent | null {
  if (value === "team" || value === "admin") return value;
  return null;
}
