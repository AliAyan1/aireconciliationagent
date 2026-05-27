import type { MatchResult } from "@/lib/types";
import type { MatchTableSort, MatchTableSortKey } from "@/lib/table-preferences";

function sortValue(r: MatchResult, key: MatchTableSortKey): string | number {
  switch (key) {
    case "description":
      return (
        r.bankTransaction?.description ??
        r.ledgerEntry?.description ??
        ""
      ).toLowerCase();
    case "amount":
      return r.bankTransaction?.amount ?? r.ledgerEntry?.amount ?? 0;
    case "date":
      return r.bankTransaction?.date ?? r.ledgerEntry?.date ?? "";
    case "confidence":
      return r.confidence;
    default:
      return 0;
  }
}

export function sortMatchResults(
  results: MatchResult[],
  sort: MatchTableSort | null
): MatchResult[] {
  if (!sort) return results;
  const sorted = [...results];
  sorted.sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv));
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}
