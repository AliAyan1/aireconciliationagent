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
  loadSessionPayload,
  logJournalEntry,
  updateMatchStatus,
  updateProposalStatus,
  updateSessionSummary,
} from "@/lib/db-helpers";
import { postEntries } from "@/lib/entries";
import { getSummary } from "@/lib/matcher";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
  MissingEntryProposal,
} from "@/lib/types";

interface PostEntriesBody {
  sessionId?: string;
  results: MatchResult[];
  matchIds?: string[];
  proposalIds?: string[];
  proposals?: MissingEntryProposal[];
  bankData: BankTransaction[];
  ledgerData: LedgerEntry[];
}

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = (await request.json()) as PostEntriesBody;

    if (!body.results?.length || !body.bankData || !body.ledgerData) {
      return apiBadRequest("results, bankData, and ledgerData are required.");
    }

    const hasMatches = body.matchIds?.length;
    const hasProposals = body.proposalIds?.length;

    if (!hasMatches && !hasProposals) {
      return apiBadRequest("Provide matchIds and/or proposalIds to post.");
    }

    let results = body.results;
    let proposals = body.proposals ?? [];
    let bankData = body.bankData;
    let ledgerData = body.ledgerData;

    if (body.sessionId && isDatabaseConfigured()) {
      const payload = await loadSessionPayload(body.sessionId);
      if (!payload) {
        return apiNotFound(`Session not found for id "${body.sessionId}".`);
      }
      results = payload.results;
      proposals = payload.proposals;
      bankData = payload.session.bankTransactions.map(fromDbBankTransaction);
      ledgerData = payload.session.ledgerEntries.map(fromDbLedgerEntry);
    }

    const output = postEntries({
      results,
      matchIds: body.matchIds,
      proposalIds: body.proposalIds,
      proposals,
    });

    const summary = getSummary(output.results, bankData, ledgerData);

    if (body.sessionId && isDatabaseConfigured()) {
      for (const id of body.matchIds ?? []) {
        await updateMatchStatus(id, "POSTED");
        const match = output.results.find((r) => r.id === id);
        await logJournalEntry({
          sessionId: body.sessionId,
          action: "ENTRY_POSTED",
          description: match?.matchReason ?? `Posted match ${id}`,
          matchResultId: id,
          bankAmount: match?.bankTransaction?.amount,
          ledgerAmount: match?.ledgerEntry?.amount,
        });
      }

      for (const pid of body.proposalIds ?? []) {
        await updateProposalStatus(pid, "POSTED");
        await logJournalEntry({
          sessionId: body.sessionId,
          action: "PROPOSAL_POSTED",
          description: `Posted generated entry proposal ${pid}`,
          proposalId: pid,
        });
      }

      await updateSessionSummary(body.sessionId, summary, { status: "POSTED" });
    }

    return NextResponse.json({
      results: output.results,
      journalPosts: output.journalPosts,
      proposals: output.proposals,
      summary,
      postedCount: output.journalPosts.length,
      databaseUsed: !!(body.sessionId && isDatabaseConfigured()),
    });
  } catch (error) {
    return apiServerError(error, "POST /api/post-entries");
  }
}
