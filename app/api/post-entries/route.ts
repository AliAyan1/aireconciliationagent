import { NextResponse } from "next/server";
import { postEntries } from "@/lib/entries";
import { getSummary } from "@/lib/matcher";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
  MissingEntryProposal,
} from "@/lib/types";

interface PostEntriesBody {
  results: MatchResult[];
  matchIds?: string[];
  proposalIds?: string[];
  proposals?: MissingEntryProposal[];
  bankData: BankTransaction[];
  ledgerData: LedgerEntry[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostEntriesBody;

    if (!body.results?.length || !body.bankData || !body.ledgerData) {
      return NextResponse.json(
        { error: "results, bankData, and ledgerData are required" },
        { status: 400 }
      );
    }

    const hasMatches = body.matchIds?.length;
    const hasProposals = body.proposalIds?.length;

    if (!hasMatches && !hasProposals) {
      return NextResponse.json(
        { error: "Provide matchIds and/or proposalIds to post" },
        { status: 400 }
      );
    }

    const output = postEntries({
      results: body.results,
      matchIds: body.matchIds,
      proposalIds: body.proposalIds,
      proposals: body.proposals ?? [],
    });

    const summary = getSummary(
      output.results,
      body.bankData,
      body.ledgerData
    );

    return NextResponse.json({
      results: output.results,
      journalPosts: output.journalPosts,
      proposals: output.proposals,
      summary,
      postedCount: output.journalPosts.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Post entries failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
