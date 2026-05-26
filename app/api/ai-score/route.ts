import { NextResponse } from "next/server";
import {
  apiBadRequest,
  apiServerError,
} from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import {
  isOpenAIConfigured,
  scoreFuzzyMatches,
  type FuzzyMatchPair,
} from "@/lib/openai";

interface AiScoreRequestBody {
  pairs?: FuzzyMatchPair[];
}

function averageConfidence(scores: { confidence: number }[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s.confidence, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  const startTime = Date.now();

  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local",
        },
        { status: 503 }
      );
    }

    let body: AiScoreRequestBody;
    try {
      body = (await request.json()) as AiScoreRequestBody;
    } catch {
      return apiBadRequest("Request body must be valid JSON.");
    }

    const pairs = body.pairs;
    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      return apiBadRequest("pairs must be a non-empty array.");
    }

    for (const pair of pairs) {
      if (
        !pair?.id ||
        typeof pair.bankDesc !== "string" ||
        typeof pair.ledgerDesc !== "string" ||
        typeof pair.bankAmount !== "number" ||
        typeof pair.ledgerAmount !== "number" ||
        typeof pair.bankDate !== "string" ||
        typeof pair.ledgerDate !== "string"
      ) {
        return apiBadRequest(
          "Each pair must include id, bankDesc, bankAmount, bankDate, ledgerDesc, ledgerAmount, and ledgerDate."
        );
      }
    }

    const results = await scoreFuzzyMatches(pairs);
    const processingTimeMs = Date.now() - startTime;
    const avgConfidence = averageConfidence(results);

    return NextResponse.json(
      {
        results,
        totalPairs: pairs.length,
        avgConfidence,
        processingTimeMs,
      },
      {
        headers: {
          "X-Pairs-Processed": String(pairs.length),
        },
      }
    );
  } catch (error) {
    return apiServerError(error, "POST /api/ai-score");
  }
}
