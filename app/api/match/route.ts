import { NextResponse } from "next/server";
import { getSummary, runMatching } from "@/lib/matcher";
import type { BankTransaction, LedgerEntry } from "@/lib/types";

interface MatchRequestBody {
  bankData: BankTransaction[];
  ledgerData: LedgerEntry[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MatchRequestBody;

    if (!body.bankData?.length || !body.ledgerData?.length) {
      return NextResponse.json(
        { error: "bankData and ledgerData arrays are required" },
        { status: 400 }
      );
    }

    const results = runMatching(body.bankData, body.ledgerData);
    const summary = getSummary(results, body.bankData, body.ledgerData);

    return NextResponse.json({ results, summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Matching failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
