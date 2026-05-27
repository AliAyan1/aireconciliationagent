import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { generateSessionSummary } from "@/lib/ai-dashboard";
import { isAuthError, requireTeam } from "@/lib/auth";
import type { MatchResult, ReconciliationSummary } from "@/lib/types";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      results?: MatchResult[];
      summary?: ReconciliationSummary;
    };
    if (!body.results || !body.summary) {
      return apiBadRequest("results and summary are required.");
    }
    const paragraph = await generateSessionSummary(body.results, {
      matchRate: body.summary.matchRate,
      autoMatched: body.summary.autoMatched,
      needsReview: body.summary.needsReview,
      unmatched: body.summary.unmatched,
      totalBankTxns: body.summary.totalBankTxns,
    });
    return NextResponse.json({ summary: paragraph });
  } catch (error) {
    return apiServerError(error, "POST /api/ai/summary");
  }
}
