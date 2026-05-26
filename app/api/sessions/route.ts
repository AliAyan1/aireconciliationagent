import { NextResponse } from "next/server";
import { apiServerError } from "@/lib/api-response";
import { isAuthError, requireAuth } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listSessions, summaryFromSession } from "@/lib/db-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  try {
    const sessions = await listSessions(50);
    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        name: s.name,
        status: s.status,
        bankFileName: s.bankFileName,
        ledgerFileName: s.ledgerFileName,
        matchRate: s.matchRate,
        totalAutoMatched: s.totalAutoMatched,
        totalNeedsReview: s.totalNeedsReview,
        totalUnmatched: s.totalUnmatched,
        summary: summaryFromSession(s),
      })),
    });
  } catch (error) {
    return apiServerError(error, "GET /api/sessions");
  }
}
