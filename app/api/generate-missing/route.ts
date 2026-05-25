import { NextResponse } from "next/server";
import { generateMissingEntries } from "@/lib/entries";
import { getSummary } from "@/lib/matcher";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
} from "@/lib/types";

interface GenerateMissingBody {
  results: MatchResult[];
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateMissingBody;

    if (!body.results?.length) {
      return NextResponse.json(
        { error: "results array is required" },
        { status: 400 }
      );
    }

    const proposals = generateMissingEntries(body.results);

    let summary = null;
    if (body.bankData && body.ledgerData) {
      summary = getSummary(body.results, body.bankData, body.ledgerData);
    }

    return NextResponse.json({
      proposals,
      count: proposals.length,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generate missing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
