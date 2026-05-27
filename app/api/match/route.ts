import { NextResponse } from "next/server";
import {
  apiBadRequest,
  apiServerError,
} from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import { applyAiScoresToResults } from "@/lib/apply-ai-scores";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createSession,
  logJournalEntry,
  saveBankTransactions,
  saveLedgerEntries,
  saveMatchResults,
  updateSessionSummary,
} from "@/lib/db-helpers";
import { mergeMatchingConfig, type MatchingConfig } from "@/lib/matching-config";
import { getSummary, runMatching } from "@/lib/matcher";
import { isOpenAIConfigured } from "@/lib/openai";
import type { BankTransaction, LedgerEntry } from "@/lib/types";

interface MatchRequestBody {
  bankData: BankTransaction[];
  ledgerData: LedgerEntry[];
  bankFileName?: string;
  ledgerFileName?: string;
  sessionName?: string;
  matchingConfig?: Partial<MatchingConfig>;
}

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as MatchRequestBody;

    if (!body.bankData?.length || !body.ledgerData?.length) {
      return apiBadRequest(
        "bankData and ledgerData are required and must contain at least one row each."
      );
    }

    const matchingConfig = mergeMatchingConfig(body.matchingConfig);

    const rulesStart = Date.now();
    let results = runMatching(
      body.bankData,
      body.ledgerData,
      matchingConfig
    );
    const rulesProcessingTimeMs = Date.now() - rulesStart;

    const aiScoringAvailable =
      matchingConfig.enableAiScoring && isOpenAIConfigured();
    let aiPairsScored = 0;
    let aiCandidateCount = 0;
    let aiProcessingTimeMs = 0;

    if (aiScoringAvailable) {
      const aiStart = Date.now();
      const aiOutput = await applyAiScoresToResults(results, matchingConfig);
      results = aiOutput.results;
      aiPairsScored = aiOutput.pairsScored;
      aiCandidateCount = aiOutput.candidateCount;
      aiProcessingTimeMs = Date.now() - aiStart;
    }

    const summary = getSummary(results, body.bankData, body.ledgerData);

    let sessionId: string | null = null;
    let persistedResults = results;

    if (isDatabaseConfigured()) {
      try {
        const session = await createSession({
          name: body.sessionName,
          bankFileName: body.bankFileName ?? "bank.csv",
          bankRowCount: body.bankData.length,
          ledgerFileName: body.ledgerFileName ?? "ledger.csv",
          ledgerRowCount: body.ledgerData.length,
        });
        sessionId = session.id;

        await logJournalEntry({
          sessionId,
          action: "SESSION_CREATED",
          description: "Reconciliation session created",
        });
        await logJournalEntry({
          sessionId,
          action: "FILES_UPLOADED",
          description: `Uploaded ${body.bankFileName ?? "bank"} and ${body.ledgerFileName ?? "ledger"}`,
        });
        await logJournalEntry({
          sessionId,
          action: "MATCHING_STARTED",
          description: "Rule-based matching started",
        });

        const bankIdMap = await saveBankTransactions(sessionId, body.bankData);
        const ledgerIdMap = await saveLedgerEntries(sessionId, body.ledgerData);

        await logJournalEntry({
          sessionId,
          action: "MATCHING_COMPLETED",
          description: `Matching completed: ${results.length} results`,
        });

        if (aiScoringAvailable && aiPairsScored > 0) {
          await logJournalEntry({
            sessionId,
            action: "AI_SCORING_STARTED",
            description: "OpenAI fuzzy scoring started",
          });
          await logJournalEntry({
            sessionId,
            action: "AI_SCORING_COMPLETED",
            description: `AI scored ${aiPairsScored} pair(s)`,
          });
        }

        persistedResults = await saveMatchResults(
          sessionId,
          results,
          bankIdMap,
          ledgerIdMap
        );

        await updateSessionSummary(sessionId, summary, {
          aiScoringUsed: aiScoringAvailable && aiPairsScored > 0,
          aiPairsScored,
          aiProcessingTimeMs,
          rulesProcessingTimeMs,
          status: "COMPLETED",
        });
      } catch (dbError) {
        console.error(
          "Database persist failed, returning in-memory results:",
          dbError
        );
        sessionId = null;
        persistedResults = results;
      }
    }

    return NextResponse.json({
      results: persistedResults,
      summary,
      sessionId,
      aiScoringAvailable,
      aiPairsScored,
      aiCandidateCount,
      aiProcessingTimeMs,
      rulesProcessingTimeMs,
      databaseUsed: !!sessionId,
    });
  } catch (error) {
    return apiServerError(error, "POST /api/match");
  }
}
