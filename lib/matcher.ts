import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
  ReconciliationSummary,
} from "./types";

const AMOUNT_TOLERANCE = 500;

export function daysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  if (Number.isNaN(d1) || Number.isNaN(d2)) return 999;
  return Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createMatch(
  bank: BankTransaction | null,
  ledger: LedgerEntry | null,
  confidence: number,
  status: MatchResult["status"],
  matchType: MatchResult["matchType"],
  matchReason: string
): MatchResult {
  return {
    id: `match-${bank?.id ?? "none"}-${ledger?.id ?? "none"}`,
    bankTransaction: bank,
    ledgerEntry: ledger,
    confidence,
    status,
    matchType,
    matchReason,
  };
}

export function runMatching(
  bankTxns: BankTransaction[],
  ledgerEntries: LedgerEntry[]
): MatchResult[] {
  const results: MatchResult[] = [];
  const matchedBank = new Set<string>();
  const matchedLedger = new Set<string>();

  // Phase 1 — Exact match
  for (const bank of bankTxns) {
    if (matchedBank.has(bank.id)) continue;

    for (const ledger of ledgerEntries) {
      if (matchedLedger.has(ledger.id)) continue;
      if (bank.type !== ledger.type) continue;
      if (bank.amount !== ledger.amount) continue;
      if (bank.date !== ledger.date) continue;

      matchedBank.add(bank.id);
      matchedLedger.add(ledger.id);
      results.push(
        createMatch(
          bank,
          ledger,
          99,
          "auto_matched",
          "exact",
          "Exact amount and date match"
        )
      );
      break;
    }
  }

  // Phase 2 — Near date match
  for (const bank of bankTxns) {
    if (matchedBank.has(bank.id)) continue;

    let bestLedger: LedgerEntry | null = null;
    let bestDays = 999;
    let bestConfidence = 0;

    for (const ledger of ledgerEntries) {
      if (matchedLedger.has(ledger.id)) continue;
      if (bank.type !== ledger.type) continue;
      if (bank.amount !== ledger.amount) continue;

      const daysDiff = daysDifference(bank.date, ledger.date);
      if (daysDiff > 2 || daysDiff === 0) continue;

      const confidence = 95 - daysDiff * 5;
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestDays = daysDiff;
        bestLedger = ledger;
      }
    }

    if (bestLedger) {
      matchedBank.add(bank.id);
      matchedLedger.add(bestLedger.id);
      const status = bestConfidence >= 90 ? "auto_matched" : "review";
      results.push(
        createMatch(
          bank,
          bestLedger,
          bestConfidence,
          status,
          "near",
          `Amount match, date offset ${bestDays} day(s)`
        )
      );
    }
  }

  // Phase 3 — Amount tolerance match
  for (const bank of bankTxns) {
    if (matchedBank.has(bank.id)) continue;

    let bestLedger: LedgerEntry | null = null;
    let bestConfidence = 0;
    let bestAmountDiff = 0;
    let bestDays = 0;

    for (const ledger of ledgerEntries) {
      if (matchedLedger.has(ledger.id)) continue;
      if (bank.type !== ledger.type) continue;

      const amountDiff = Math.abs(bank.amount - ledger.amount);
      if (amountDiff > AMOUNT_TOLERANCE) continue;

      const daysDiff = daysDifference(bank.date, ledger.date);
      if (daysDiff > 3) continue;

      const confidence = clamp(
        85 - amountDiff / 100 - daysDiff * 3,
        70,
        85
      );

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestLedger = ledger;
        bestAmountDiff = amountDiff;
        bestDays = daysDiff;
      }
    }

    if (bestLedger) {
      matchedBank.add(bank.id);
      matchedLedger.add(bestLedger.id);
      results.push(
        createMatch(
          bank,
          bestLedger,
          bestConfidence,
          "review",
          "fuzzy",
          `Amount diff PKR ${Math.round(bestAmountDiff)}, date offset ${bestDays} day(s)`
        )
      );
    }
  }

  // Phase 4 — Unmatched bank
  for (const bank of bankTxns) {
    if (matchedBank.has(bank.id)) continue;
    results.push(
      createMatch(
        bank,
        null,
        0,
        "unmatched",
        "unmatched",
        "No matching ledger entry found"
      )
    );
  }

  // Phase 4 — Unmatched ledger
  for (const ledger of ledgerEntries) {
    if (matchedLedger.has(ledger.id)) continue;
    results.push(
      createMatch(
        null,
        ledger,
        0,
        "unmatched",
        "unmatched",
        "No matching bank transaction found"
      )
    );
  }

  return results;
}

export function getSummary(
  results: MatchResult[],
  bankTxns: BankTransaction[],
  ledgerEntries: LedgerEntry[]
): ReconciliationSummary {
  const autoMatched = results.filter((r) => r.status === "auto_matched").length;
  const approved = results.filter((r) => r.status === "approved").length;
  const posted = results.filter((r) => r.status === "posted").length;
  const needsReview = results.filter((r) => r.status === "review").length;
  const unmatched = results.filter((r) => r.status === "unmatched").length;

  const totalBankAmount = bankTxns.reduce((sum, t) => sum + t.amount, 0);
  const totalLedgerAmount = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);

  const total = bankTxns.length || 1;
  const matchRate = ((autoMatched + approved + posted) / total) * 100;

  return {
    totalBankTxns: bankTxns.length,
    totalLedgerEntries: ledgerEntries.length,
    autoMatched,
    needsReview,
    unmatched,
    posted,
    pendingMissing: unmatched,
    matchRate: Math.round(matchRate * 10) / 10,
    totalBankAmount,
    totalLedgerAmount,
    difference: totalBankAmount - totalLedgerAmount,
  };
}
