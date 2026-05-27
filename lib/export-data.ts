import type { ReportTemplate } from "./export-templates";
import type { JournalPost, MatchResult } from "./types";

function rowAmount(r: MatchResult): number {
  return Math.max(r.bankTransaction?.amount ?? 0, r.ledgerEntry?.amount ?? 0);
}

export function filterResultsByTemplate(
  results: MatchResult[],
  template: ReportTemplate
): MatchResult[] {
  let filtered = [...results];

  if (!template.includeMatched) {
    filtered = filtered.filter((r) => r.status === "unmatched");
  }
  if (!template.includeUnmatched) {
    filtered = filtered.filter((r) => r.status !== "unmatched");
  }
  if (template.minAmountPkr > 0) {
    filtered = filtered.filter((r) => rowAmount(r) >= template.minAmountPkr);
  }

  return filtered;
}

export function maskMatchResults(results: MatchResult[]): MatchResult[] {
  const total = results.reduce((s, r) => s + rowAmount(r), 0) || 1;
  let idx = 0;

  return results.map((r) => {
    idx += 1;
    const label = `Transaction ${String.fromCharCode(64 + ((idx - 1) % 26) + 1)}${idx > 26 ? idx : ""}`;
    const share = rowAmount(r) / total;
    const fakeBase = 100_000 * share;

    const maskBank = r.bankTransaction
      ? {
          ...r.bankTransaction,
          description: label,
          amount: Math.round(fakeBase * 100) / 100,
        }
      : null;

    const maskLedger = r.ledgerEntry
      ? {
          ...r.ledgerEntry,
          description: label,
          amount: Math.round(fakeBase * 100) / 100,
        }
      : null;

    return {
      ...r,
      bankTransaction: maskBank,
      ledgerEntry: maskLedger,
      matchReason: "Masked for external sharing",
    };
  });
}

export function filterJournalByTemplate(
  journal: JournalPost[],
  template: ReportTemplate
): JournalPost[] {
  if (!template.includeJournal) return [];
  return journal;
}
