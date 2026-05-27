import type { MatchResult } from "./types";
import { formatPKR } from "./format";

export function resultsToTsv(results: MatchResult[]): string {
  const headers = [
    "Status",
    "Type",
    "Confidence",
    "Bank Date",
    "Bank Description",
    "Bank Amount",
    "Ledger Date",
    "Ledger Description",
    "Ledger Amount",
  ];
  const rows = results.map((r) =>
    [
      r.status,
      r.matchType,
      String(r.confidence),
      r.bankTransaction?.date ?? "",
      r.bankTransaction?.description ?? "",
      r.bankTransaction ? formatPKR(r.bankTransaction.amount) : "",
      r.ledgerEntry?.date ?? "",
      r.ledgerEntry?.description ?? "",
      r.ledgerEntry ? formatPKR(r.ledgerEntry.amount) : "",
    ].join("\t")
  );
  return [headers.join("\t"), ...rows].join("\n");
}

export async function copyResultsToClipboard(
  results: MatchResult[]
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(resultsToTsv(results));
    return true;
  } catch {
    return false;
  }
}
