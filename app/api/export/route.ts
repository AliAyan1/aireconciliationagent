import { NextResponse } from "next/server";
import {
  apiBadRequest,
  apiNotFound,
  apiServerError,
} from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import { APP_NAME, APP_REPORT_FILENAME_PREFIX } from "@/lib/branding";
import { isDatabaseConfigured } from "@/lib/db";
import { loadSessionPayload, logJournalEntry } from "@/lib/db-helpers";
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

function buildCsv(results: MatchResult[]): string {
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

  return [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")),
  ].join("\n");
}

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const sessionId = body.sessionId as string | undefined;
    let results = body.results as MatchResult[] | undefined;

    if (sessionId && isDatabaseConfigured()) {
      const payload = await loadSessionPayload(sessionId);
      if (!payload) {
        return apiNotFound(`Session not found for id "${sessionId}".`);
      }
      results = payload.results;

      await logJournalEntry({
        sessionId,
        action: "REPORT_EXPORTED",
        description: `Exported ${APP_NAME} report (${results.length} rows)`,
      });
    }

    if (!results?.length) {
      return apiBadRequest(
        "results array or a valid sessionId with saved matches is required."
      );
    }

    const csv = buildCsv(results);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${APP_REPORT_FILENAME_PREFIX}.csv"`,
      },
    });
  } catch (error) {
    return apiServerError(error, "POST /api/export");
  }
}
