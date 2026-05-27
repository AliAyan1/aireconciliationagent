import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { homePathForRole, parseLoginIntent } from "@/lib/auth-routes";
import { SESSION_COOKIE, verifyAuthToken } from "@/lib/auth-token";

const TEAM_PREFIXES = ["/upload", "/dashboard", "/history", "/compare", "/test"];
const ADMIN_PREFIXES = ["/admin"];

const TEAM_API_PREFIXES = [
  "/api/match",
  "/api/review",
  "/api/post-entries",
  "/api/generate-missing",
  "/api/export",
  "/api/ai-score",
  "/api/ai",
  "/api/analytics",
  "/api/evaluate",
  "/api/test-run",
  "/api/share",
  "/api/user/delete-data",
  "/api/journal-export",
  "/api/export-versions",
];

function startsWithAny(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifyAuthToken(token) : null;

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (user) {
      const intent = parseLoginIntent(
        request.nextUrl.searchParams.get("role")
      );
      // Allow switching accounts (e.g. admin session → team sign-in)
      if (
        intent &&
        ((intent === "team" && user.role === "ADMIN") ||
          (intent === "admin" && user.role === "TEAM"))
      ) {
        return NextResponse.next();
      }
      return NextResponse.redirect(
        new URL(homePathForRole(user.role), request.url)
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (
      request.method === "GET" &&
      /^\/api\/share\/[^/]+$/.test(pathname)
    ) {
      return NextResponse.next();
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname.startsWith("/api/admin") && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      startsWithAny(pathname, TEAM_API_PREFIXES) &&
      user.role !== "TEAM"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  const needsTeam = startsWithAny(pathname, TEAM_PREFIXES);
  const needsAdmin = startsWithAny(pathname, ADMIN_PREFIXES);

  if (!needsTeam && !needsAdmin) {
    return NextResponse.next();
  }

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (needsTeam && user.role !== "TEAM") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (needsAdmin && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/upload", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/upload/:path*",
    "/dashboard/:path*",
    "/history/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
