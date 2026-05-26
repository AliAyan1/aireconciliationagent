import { NextResponse } from "next/server";
import {
  apiBadRequest,
  apiNotFound,
  apiServerError,
} from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import {
  fromDbBankTransaction,
  fromDbLedgerEntry,
  toDbMatchStatus,
} from "@/lib/db-mappers";
import { isDatabaseConfigured } from "@/lib/db";
import {
  loadSessionPayload,
  logJournalEntry,
  updateMatchStatus,
  updateSessionSummary,
} from "@/lib/db-helpers";
import { getSummary } from "@/lib/matcher";
import type { MatchStatus } from "@/lib/types";

interface ReviewBody {
  sessionId: string;
  matchId: string;
  action: "approve" | "reject";
  note?: string;
  reviewedBy?: string;
}

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as ReviewBody;

    if (!body.sessionId || !body.matchId || !body.action) {
      return apiBadRequest("sessionId, matchId, and action are required.");
    }
    if (body.action !== "approve" && body.action !== "reject") {
      return apiBadRequest('action must be "approve" or "reject".');
    }

    const appStatus: MatchStatus =
      body.action === "approve" ? "approved" : "rejected";

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        match: { id: body.matchId, status: appStatus },
        databaseUsed: false,
      });
    }

    let updated;
    try {
      updated = await updateMatchStatus(
        body.matchId,
        toDbMatchStatus(appStatus),
        body.reviewedBy ?? "user",
        body.note
      );
    } catch {
      return apiNotFound(`Match not found for id "${body.matchId}".`);
    }

    await logJournalEntry({
      sessionId: body.sessionId,
      action:
        body.action === "approve" ? "MATCH_APPROVED" : "MATCH_REJECTED",
      description: `Match ${body.action}d: ${updated.matchReason}`,
      matchResultId: body.matchId,
      performedBy: body.reviewedBy ?? "user",
      bankAmount: updated.bankTransaction?.amount,
      ledgerAmount: updated.ledgerEntry?.amount,
    });

    const payload = await loadSessionPayload(body.sessionId);
    if (payload) {
      const bankData = payload.session.bankTransactions.map(fromDbBankTransaction);
      const ledgerData = payload.session.ledgerEntries.map(fromDbLedgerEntry);
      const summary = getSummary(payload.results, bankData, ledgerData);
      await updateSessionSummary(body.sessionId, summary, {
        status: "REVIEWED",
      });
    }

    return NextResponse.json({
      match: updated,
      databaseUsed: true,
    });
  } catch (error) {
    return apiServerError(error, "POST /api/review");
  }
}
