import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { generateExecutiveSummary } from "@/lib/ai-dashboard";
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
    const text = await generateExecutiveSummary(body.results, {
      matchRate: body.summary.matchRate,
      autoMatched: body.summary.autoMatched,
      needsReview: body.summary.needsReview,
      unmatched: body.summary.unmatched,
      difference: body.summary.difference,
    });
    return NextResponse.json({ text });
  } catch (error) {
    return apiServerError(error, "POST /api/ai/executive-summary");
  }
}
