import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { reviewChat } from "@/lib/ai-dashboard";
import { isAuthError, requireTeam } from "@/lib/auth";
import type { MatchResult } from "@/lib/types";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as {
      match?: MatchResult;
      question?: string;
    };
    if (!body.match || !body.question?.trim()) {
      return apiBadRequest("match and question required.");
    }
    const reply = await reviewChat(body.match, body.question.trim());
    return NextResponse.json({ reply });
  } catch (error) {
    return apiServerError(error, "POST /api/ai/review-chat");
  }
}
