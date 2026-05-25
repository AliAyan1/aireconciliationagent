import { NextResponse } from "next/server";
import type { MatchResult } from "@/lib/types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function amountDiff(result: MatchResult): string {
  const bank = result.bankTransaction?.amount ?? 0;
  const ledger = result.ledgerEntry?.amount ?? 0;
  if (!result.bankTransaction || !result.ledgerEntry) return "";
  return String(Math.abs(bank - ledger));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const results = body.results as MatchResult[] | undefined;

    if (!results?.length) {
      return NextResponse.json(
        { error: "results array is required" },
        { status: 400 }
      );
    }

    const headers = [
      "Status",
      "Match_Type",
      "Confidence",
      "Posted_At",
      "Bank_Date",
      "Bank_Description",
      "Bank_Amount",
      "Ledger_Date",
      "Ledger_Description",
      "Ledger_Amount",
      "Ledger_Invoice",
      "Amount_Difference",
      "Match_Reason",
    ];

    const rows = results.map((r) => [
      r.status,
      r.matchType,
      String(r.confidence),
      r.postedAt ?? "",
      r.bankTransaction?.date ?? "",
      r.bankTransaction?.description ?? "",
      r.bankTransaction ? String(r.bankTransaction.amount) : "",
      r.ledgerEntry?.date ?? "",
      r.ledgerEntry?.description ?? "",
      r.ledgerEntry ? String(r.ledgerEntry.amount) : "",
      r.ledgerEntry?.invoiceNo ?? "",
      amountDiff(r),
      r.matchReason,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="reconciliation-report.csv"',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
