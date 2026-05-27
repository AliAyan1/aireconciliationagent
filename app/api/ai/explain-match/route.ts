import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { explainMatch } from "@/lib/ai-dashboard";
import { isAuthError, requireTeam } from "@/lib/auth";
import { isOpenAIConfigured } from "@/lib/openai";
import type { MatchResult } from "@/lib/types";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { match?: MatchResult };
    const match = body.match;
    if (!match?.id) {
      return apiBadRequest("match object with id is required.");
    }
    if (!match.bankTransaction || !match.ledgerEntry) {
      return apiBadRequest("Match must include bank and ledger transactions.");
    }

    const explanation = await explainMatch(match);
    return NextResponse.json({ explanation });
  } catch (error) {
    return apiServerError(error, "POST /api/ai/explain-match");
  }
}
