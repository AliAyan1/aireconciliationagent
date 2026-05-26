import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import { homePathForRole } from "@/lib/auth-routes";
import { normalizeLoginEmail } from "@/lib/demo-accounts";
import { isDatabaseConfigured } from "@/lib/db";
import { verifyUserPassword } from "@/lib/users";
import { apiServerError } from "@/lib/api-response";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured. Set DATABASE_URL in .env.local." },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = normalizeLoginEmail(body.email ?? "");
  const password = body.password?.trim() ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const user = await verifyUserPassword(email, password);
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password. Use the demo buttons below or team@hisaabai.local / team12345",
        },
        { status: 401 }
      );
    }

    const token = await signAuthToken(user);
    const response = NextResponse.json({
      user,
      redirectTo: homePathForRole(user.role),
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return apiServerError(error, "POST /api/auth/login");
  }
}
