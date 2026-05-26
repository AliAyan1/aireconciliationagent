import { NextResponse } from "next/server";
import { apiNotFound, apiServerError } from "@/lib/api-response";
import { isAuthError, requireAuth } from "@/lib/auth";
import { fromDbBankTransaction, fromDbLedgerEntry } from "@/lib/db-mappers";
import { isDatabaseConfigured } from "@/lib/db";
import { loadSessionPayload } from "@/lib/db-helpers";
import type { JournalPost } from "@/lib/types";

function mapJournal(
  rows: NonNullable<Awaited<ReturnType<typeof loadSessionPayload>>>["journalPosts"]
): JournalPost[] {
  return rows.map((j) => ({
    id: j.id,
    matchId: j.matchResultId ?? "",
    postedAt: j.createdAt.toISOString(),
    amount: j.bankAmount ?? j.ledgerAmount ?? 0,
    type: "debit",
    narration: j.description,
    bankReference: "",
    ledgerReference: "",
    invoiceNo: "",
  }));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  try {
    const { id } = await context.params;
    const payload = await loadSessionPayload(id);

    if (!payload) {
      return apiNotFound(
        `Session not found. It may have been deleted or the link is invalid.`
      );
    }

    const bankData = payload.session.bankTransactions.map(fromDbBankTransaction);
    const ledgerData = payload.session.ledgerEntries.map(fromDbLedgerEntry);

    return NextResponse.json({
      session: {
        id: payload.session.id,
        createdAt: payload.session.createdAt,
        status: payload.session.status,
        bankFileName: payload.session.bankFileName,
        ledgerFileName: payload.session.ledgerFileName,
        aiScoringUsed: payload.session.aiScoringUsed,
        aiPairsScored: payload.session.aiPairsScored,
        aiProcessingTimeMs: payload.session.aiProcessingTimeMs,
      },
      results: payload.results,
      summary: payload.summary,
      proposals: payload.proposals,
      bankData,
      ledgerData,
      journal: payload.journalPosts,
      journalPosts: mapJournal(payload.journalPosts),
    });
  } catch (error) {
    return apiServerError(error, "GET /api/sessions/[id]");
  }
}
