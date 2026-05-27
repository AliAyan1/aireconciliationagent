import { formatPKR } from "./format";
import type { MatchResult } from "./types";

export interface AmountMismatchRow {
  id: string;
  description: string;
  bankAmount: number;
  ledgerAmount: number;
  difference: number;
  matchType: MatchResult["matchType"];
}

export interface AmountMismatchSummary {
  count: number;
  totalDifference: number;
  averageDifference: number;
  largest: AmountMismatchRow | null;
  rows: AmountMismatchRow[];
  narrative: string;
}

function isAmountMismatchCandidate(r: MatchResult): boolean {
  if (!r.bankTransaction || !r.ledgerEntry) return false;
  if (r.matchType !== "fuzzy" && r.matchType !== "near" && r.matchType !== "ai_scored") {
    return false;
  }
  const diff = Math.abs(r.bankTransaction.amount - r.ledgerEntry.amount);
  return diff > 0.01;
}

export function buildAmountMismatchSummary(
  results: MatchResult[]
): AmountMismatchSummary {
  const rows: AmountMismatchRow[] = results
    .filter(isAmountMismatchCandidate)
    .map((r) => {
      const bank = r.bankTransaction!;
      const ledger = r.ledgerEntry!;
      const difference = Math.abs(bank.amount - ledger.amount);
      return {
        id: r.id,
        description: bank.description.slice(0, 60),
        bankAmount: bank.amount,
        ledgerAmount: ledger.amount,
        difference,
        matchType: r.matchType,
      };
    })
    .sort((a, b) => b.difference - a.difference);

  const count = rows.length;
  const totalDifference = rows.reduce((s, r) => s + r.difference, 0);
  const averageDifference = count > 0 ? totalDifference / count : 0;
  const largest = rows[0] ?? null;

  let narrative = "No fuzzy matches with amount differences in this session.";
  if (count > 0) {
    const matchWord = count === 1 ? "match" : "matches";
    narrative =
      `Total amount differences: ${formatPKR(totalDifference)} across ${count} ${matchWord}. ` +
      `Average difference: ${formatPKR(Math.round(averageDifference))}.`;
    if (largest) {
      narrative +=
        ` Largest: ${formatPKR(largest.difference)} on '${largest.description}' — likely bank charges.`;
    }
  }

  return {
    count,
    totalDifference,
    averageDifference,
    largest,
    rows,
    narrative,
  };
}
