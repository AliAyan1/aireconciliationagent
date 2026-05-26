import { NextResponse } from "next/server";
import {
  apiBadRequest,
  apiNotFound,
  apiServerError,
} from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import { fromDbBankTransaction, fromDbLedgerEntry } from "@/lib/db-mappers";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getProposals,
  loadSessionPayload,
  logJournalEntry,
  saveProposals,
  updateSessionSummary,
} from "@/lib/db-helpers";
import { generateMissingEntries } from "@/lib/entries";
import { getSummary } from "@/lib/matcher";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
} from "@/lib/types";

interface GenerateMissingBody {
  sessionId?: string;
  results: MatchResult[];
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
}

function identityIdMap(items: { id: string }[]): Map<string, string> {
  return new Map(items.map((i) => [i.id, i.id]));
}

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as GenerateMissingBody;

    if (!body.results?.length && !body.sessionId) {
      return apiBadRequest("results array or sessionId is required.");
    }

    let results = body.results ?? [];
    let bankData = body.bankData;
    let ledgerData = body.ledgerData;

    if (body.sessionId && isDatabaseConfigured()) {
      const payload = await loadSessionPayload(body.sessionId);
      if (!payload) {
        return apiNotFound(`Session not found for id "${body.sessionId}".`);
      }
      results = payload.results;
      bankData = payload.session.bankTransactions.map(fromDbBankTransaction);
      ledgerData = payload.session.ledgerEntries.map(fromDbLedgerEntry);
    }

    const proposals = generateMissingEntries(results);

    let summary = null;
    if (bankData && ledgerData) {
      summary = getSummary(results, bankData, ledgerData);
    }

    if (body.sessionId && isDatabaseConfigured() && proposals.length > 0) {
      const bankIdMap = identityIdMap(
        bankData ?? results.flatMap((r) => (r.bankTransaction ? [r.bankTransaction] : []))
      );
      const ledgerIdMap = identityIdMap(
        ledgerData ?? results.flatMap((r) => (r.ledgerEntry ? [r.ledgerEntry] : []))
      );

      await saveProposals(body.sessionId, proposals, bankIdMap, ledgerIdMap);
      await logJournalEntry({
        sessionId: body.sessionId,
        action: "MISSING_GENERATED",
        description: `Generated ${proposals.length} missing entry proposal(s)`,
      });

      if (summary) {
        await updateSessionSummary(body.sessionId, summary);
      }

      const saved = await getProposals(body.sessionId);
      return NextResponse.json({
        proposals: saved,
        count: saved.length,
        summary,
        databaseUsed: true,
      });
    }

    return NextResponse.json({
      proposals,
      count: proposals.length,
      summary,
      databaseUsed: false,
    });
  } catch (error) {
    return apiServerError(error, "POST /api/generate-missing");
  }
}
