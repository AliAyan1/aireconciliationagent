import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { runNaturalLanguageQuery } from "@/lib/ai-dashboard";
import { isAuthError, requireTeam } from "@/lib/auth";
import { isOpenAIConfigured } from "@/lib/openai";
import type { MatchResult } from "@/lib/types";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      {
        error: "OpenAI API key not configured.",
        message: "Add OPENAI_API_KEY to enable AI queries.",
        matchIds: null,
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      question?: string;
      results?: MatchResult[];
    };
    const question = body.question?.trim();
    if (!question) {
      return apiBadRequest("question is required.");
    }
    if (!body.results || !Array.isArray(body.results)) {
      return apiBadRequest("results array is required.");
    }

    const result = await runNaturalLanguageQuery(question, body.results);
    return NextResponse.json(result);
  } catch (error) {
    return apiServerError(error, "POST /api/ai/query");
  }
}
