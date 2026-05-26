import type { MatchResult } from "./types";

export function matchResultMatchesQuery(
  result: MatchResult,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    result.matchReason,
    result.bankTransaction?.description,
    result.bankTransaction?.reference,
    result.bankTransaction?.date,
    result.bankTransaction?.amount != null
      ? String(result.bankTransaction.amount)
      : null,
    result.ledgerEntry?.description,
    result.ledgerEntry?.reference,
    result.ledgerEntry?.invoiceNo,
    result.ledgerEntry?.date,
    result.ledgerEntry?.amount != null
      ? String(result.ledgerEntry.amount)
      : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function filterResultsByQuery(
  results: MatchResult[],
  query: string
): MatchResult[] {
  if (!query.trim()) return results;
  return results.filter((r) => matchResultMatchesQuery(r, query));
}
