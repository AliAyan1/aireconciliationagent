import { NextResponse } from "next/server";
import { apiBadRequest, apiServerError } from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { logJournalEntry } from "@/lib/db-helpers";
import { prisma } from "@/lib/db";
import { evaluateResults } from "@/lib/evaluator";
import type { MatchResult } from "@/lib/types";

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const results = body.results as MatchResult[] | undefined;
    const totalProcessingMs = Number(body.totalProcessingMs ?? 0);
    const aiProcessingMs = Number(body.aiProcessingMs ?? 0);
    const sessionId = body.sessionId as string | undefined;

    if (!Array.isArray(results) || results.length === 0) {
      return apiBadRequest("results must be a non-empty array.");
    }

    const evaluation = evaluateResults(
      results,
      Number.isFinite(totalProcessingMs) ? totalProcessingMs : 0,
      Number.isFinite(aiProcessingMs) ? aiProcessingMs : 0
    );

    if (sessionId && isDatabaseConfigured()) {
      const existing = await prisma.reconciliationSession.findUnique({
        where: { id: sessionId },
        select: { id: true },
      });
      if (existing) {
        await prisma.reconciliationSession.update({
          where: { id: sessionId },
          data: {
            precision: evaluation.precision,
            recall: evaluation.recall,
            f1Score: evaluation.f1Score,
            accuracy: evaluation.accuracy,
          },
        });

        await logJournalEntry({
          sessionId,
          action: "EVALUATION_RUN",
          description: `Evaluation: precision ${evaluation.precision}%, recall ${evaluation.recall}%, F1 ${evaluation.f1Score}%, accuracy ${evaluation.accuracy}%`,
        });
      }
    }

    return NextResponse.json(
      { evaluation },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (error) {
    return apiServerError(error, "POST /api/evaluate");
  }
}
