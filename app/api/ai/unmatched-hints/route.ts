import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { suggestUnmatchedHints } from "@/lib/ai-dashboard";
import { isAuthError, requireTeam } from "@/lib/auth";
import type { MatchResult } from "@/lib/types";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as { results?: MatchResult[] };
    if (!body.results) return apiBadRequest("results required.");
    const hints = await suggestUnmatchedHints(body.results);
    return NextResponse.json({ hints });
  } catch (error) {
    return apiServerError(error, "POST /api/ai/unmatched-hints");
  }
}
