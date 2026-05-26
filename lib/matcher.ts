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

// ─── Phase 5: AI scoring candidates ─────────────────────────────────

const AI_AMOUNT_TOLERANCE = 2000;
const AI_DATE_TOLERANCE_DAYS = 5;
const MAX_AI_CANDIDATES = 30;

export interface AIScoringCandidate {
  id: string;
  bankDesc: string;
  bankAmount: number;
  bankDate: string;
  ledgerDesc: string;
  ledgerAmount: number;
  ledgerDate: string;
}

type CandidateWithSort = AIScoringCandidate & { amountDiff: number };

export function crossMatchCandidateId(
  bankId: string,
  ledgerId: string
): string {
  return `ai-cross__${bankId}__${ledgerId}`;
}

function parseCrossMatchCandidateId(
  id: string
): { bankId: string; ledgerId: string } | null {
  if (!id.startsWith("ai-cross__")) return null;
  const parts = id.split("__");
  if (parts.length !== 3) return null;
  return { bankId: parts[1], ledgerId: parts[2] };
}

export function getAIScoringCandidates(
  results: MatchResult[]
): AIScoringCandidate[] {
  const candidates: CandidateWithSort[] = [];

  for (const r of results) {
    if (r.status !== "review") continue;
    const bank = r.bankTransaction;
    const ledger = r.ledgerEntry;
    if (!bank || !ledger) continue;

    candidates.push({
      id: r.id,
      bankDesc: bank.description,
      bankAmount: bank.amount,
      bankDate: bank.date,
      ledgerDesc: ledger.description,
      ledgerAmount: ledger.amount,
      ledgerDate: ledger.date,
      amountDiff: Math.abs(bank.amount - ledger.amount),
    });
  }

  const unmatchedBank = results.filter(
    (r) =>
      r.status === "unmatched" && r.bankTransaction && !r.ledgerEntry
  );
  const unmatchedLedger = results.filter(
    (r) =>
      r.status === "unmatched" && r.ledgerEntry && !r.bankTransaction
  );

  for (const bankResult of unmatchedBank) {
    const bank = bankResult.bankTransaction!;

    let bestLedger: LedgerEntry | null = null;
    let bestAmountDiff = Infinity;

    for (const ledgerResult of unmatchedLedger) {
      const ledger = ledgerResult.ledgerEntry!;
      if (bank.type !== ledger.type) continue;

      const amountDiff = Math.abs(bank.amount - ledger.amount);
      if (amountDiff > AI_AMOUNT_TOLERANCE) continue;

      const days = daysDifference(bank.date, ledger.date);
      if (days > AI_DATE_TOLERANCE_DAYS) continue;

      if (amountDiff < bestAmountDiff) {
        bestAmountDiff = amountDiff;
        bestLedger = ledger;
      }
    }

    if (bestLedger) {
      candidates.push({
        id: crossMatchCandidateId(bank.id, bestLedger.id),
        bankDesc: bank.description,
        bankAmount: bank.amount,
        bankDate: bank.date,
        ledgerDesc: bestLedger.description,
        ledgerAmount: bestLedger.amount,
        ledgerDate: bestLedger.date,
        amountDiff: bestAmountDiff,
      });
    }
  }

  candidates.sort((a, b) => a.amountDiff - b.amountDiff);
  return candidates.slice(0, MAX_AI_CANDIDATES).map((c) => ({
    id: c.id,
    bankDesc: c.bankDesc,
    bankAmount: c.bankAmount,
    bankDate: c.bankDate,
    ledgerDesc: c.ledgerDesc,
    ledgerAmount: c.ledgerAmount,
    ledgerDate: c.ledgerDate,
  }));
}

function statusFromAIConfidence(confidence: number): MatchResult["status"] {
  if (confidence >= 90) return "auto_matched";
  if (confidence >= 70) return "review";
  return "unmatched";
}

/** When AI rejects a pair (<70), split linked rows so Unmatched UI lists them correctly. */
function splitRejectedPair(
  match: MatchResult,
  score: { confidence: number; reasoning: string },
  scoredAt: string
): MatchResult[] {
  const bank = match.bankTransaction;
  const ledger = match.ledgerEntry;
  const meta: MatchResult["aiMetadata"] = {
    aiScored: true,
    aiConfidence: score.confidence,
    aiReasoning: score.reasoning,
    scoredAt,
  };
  if (!bank || !ledger) {
    return [
      {
        ...match,
        confidence: 0,
        status: "unmatched",
        matchType: "unmatched",
        matchReason: `AI: ${score.reasoning}`,
        aiMetadata: meta,
      },
    ];
  }
  const reason = `AI: ${score.reasoning}`;
  return [
    { ...createMatch(bank, null, 0, "unmatched", "unmatched", reason), aiMetadata: meta },
    { ...createMatch(null, ledger, 0, "unmatched", "unmatched", reason), aiMetadata: meta },
  ];
}

function applyScoreToMatch(
  match: MatchResult,
  score: { confidence: number; reasoning: string },
  scoredAt: string
): MatchResult | MatchResult[] {
  const status = statusFromAIConfidence(score.confidence);
  if (status === "unmatched" && match.bankTransaction && match.ledgerEntry) {
    return splitRejectedPair(match, score, scoredAt);
  }
  return {
    ...match,
    confidence: score.confidence,
    status,
    matchType: "ai_scored",
    matchReason: `AI: ${score.reasoning}`,
    aiMetadata: {
      aiScored: true,
      aiConfidence: score.confidence,
      aiReasoning: score.reasoning,
      scoredAt,
    },
  };
}

export function applyAIScores(
  results: MatchResult[],
  aiScores: Array<{ id: string; confidence: number; reasoning: string }>
): MatchResult[] {
  if (aiScores.length === 0) return results;

  const scoreMap = new Map(aiScores.map((s) => [s.id, s]));
  const scoredAt = new Date().toISOString();
  const consumeBankIds = new Set<string>();
  const consumeLedgerIds = new Set<string>();
  const mergedMatches: MatchResult[] = [];

  for (const score of aiScores) {
    const cross = parseCrossMatchCandidateId(score.id);
    if (!cross || score.confidence < 70) continue;

    const bankResult = results.find(
      (r) => r.bankTransaction?.id === cross.bankId
    );
    const ledgerResult = results.find(
      (r) => r.ledgerEntry?.id === cross.ledgerId
    );
    const bank = bankResult?.bankTransaction;
    const ledger = ledgerResult?.ledgerEntry;
    if (!bank || !ledger) continue;

    consumeBankIds.add(bank.id);
    consumeLedgerIds.add(ledger.id);

    mergedMatches.push({
      id: crossMatchCandidateId(bank.id, ledger.id),
      bankTransaction: bank,
      ledgerEntry: ledger,
      confidence: score.confidence,
      status: statusFromAIConfidence(score.confidence),
      matchType: "ai_scored",
      matchReason: `AI: ${score.reasoning}`,
      aiMetadata: {
        aiScored: true,
        aiConfidence: score.confidence,
        aiReasoning: score.reasoning,
        scoredAt,
      },
    });
  }

  const filtered = results.filter((r) => {
    if (r.bankTransaction && consumeBankIds.has(r.bankTransaction.id)) {
      return false;
    }
    if (r.ledgerEntry && consumeLedgerIds.has(r.ledgerEntry.id)) {
      return false;
    }
    return true;
  });

  const updated = filtered.flatMap((r) => {
    const score = scoreMap.get(r.id);
    if (!score) return [r];
    const applied = applyScoreToMatch(r, score, scoredAt);
    return Array.isArray(applied) ? applied : [applied];
  });

  return [...updated, ...mergedMatches];
}
