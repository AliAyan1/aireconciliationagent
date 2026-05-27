import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { detectAnomalies } from "@/lib/ai-dashboard";
import { isAuthError, requireTeam } from "@/lib/auth";
import { isOpenAIConfigured } from "@/lib/openai";
import type { MatchResult } from "@/lib/types";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ flags: [] });
  }

  try {
    const body = (await request.json()) as { results?: MatchResult[] };
    if (!body.results || !Array.isArray(body.results)) {
      return apiBadRequest("results array is required.");
    }
    const flags = await detectAnomalies(body.results);
    return NextResponse.json({ flags });
  } catch (error) {
    return apiServerError(error, "POST /api/ai/anomalies");
  }
}
