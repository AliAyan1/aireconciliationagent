import { NextResponse } from "next/server";
import { apiServerError } from "@/lib/api-response";
import { getAdminOverview } from "@/lib/admin-analytics";
import { isAuthError, requireAdmin } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  try {
    const overview = await getAdminOverview();
    if (!overview) {
      return NextResponse.json(
        { error: "Could not load overview" },
        { status: 500 }
      );
    }
    return NextResponse.json(overview, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiServerError(error, "GET /api/admin/overview");
  }
}
