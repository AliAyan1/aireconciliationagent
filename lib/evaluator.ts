import type { MatchResult } from "./types";

export interface GroundTruthEntry {
  bankHint: string;
  ledgerHint: string;
  shouldMatch: boolean;
  expectedType: "exact" | "near" | "fuzzy" | "ai" | "none";
  notes: string;
}

export const GROUND_TRUTH: GroundTruthEntry[] = [
  {
    bankHint: "JAZZCASH TRF",
    ledgerHint: "Jazz Cash Payment",
    shouldMatch: true,
    expectedType: "exact",
    notes:
      "Both PKR 25,000 on May 1. Names differ but amounts/dates match exactly.",
  },
  {
    bankHint: "EASYPAISA MERCHANT",
    ledgerHint: "Easypaisa Collection",
    shouldMatch: true,
    expectedType: "exact",
    notes:
      "Both PKR 7,800 on May 1. EASYPAISA vs Easypaisa — same platform.",
  },
  {
    bankHint: "M AHMED SERVICES",
    ledgerHint: "Muhammad Ahmed",
    shouldMatch: true,
    expectedType: "exact",
    notes:
      "Both PKR 52,000. Bank: May 2, Ledger: May 1. Amount exact, 1-day offset.",
  },
  {
    bankHint: "HBL NEFT CR",
    ledgerHint: "HBL Transfer - Client ABC",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 148,500 on May 3. HBL NEFT = HBL Transfer.",
  },
  {
    bankHint: "BANK CHARGES MAY",
    ledgerHint: "Bank Service Charges",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 2,350 on May 5. Bank charges = service charges.",
  },
  {
    bankHint: "SALARY TRF MAY",
    ledgerHint: "Staff Salaries",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 285,000 on May 5. Salary transfer = staff salaries.",
  },
  {
    bankHint: "UTILITY BILL LESCO",
    ledgerHint: "LESCO Electricity",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 18,900. Bank: May 6, Ledger: May 6. Same utility.",
  },
  {
    bankHint: "IBFT CR AHMED ALI",
    ledgerHint: "Ahmed Ali - Freelance",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 67,000 on May 8. IBFT credit = freelance payment.",
  },
  {
    bankHint: "STANDING ORDER RENT",
    ledgerHint: "Office Rent",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 45,000 on May 8. Standing order for rent.",
  },
  {
    bankHint: "MOBILINK TRF",
    ledgerHint: "Mobilink Microfinance",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 12,500 on May 9. Same platform.",
  },
  {
    bankHint: "PETTY CASH WDL",
    ledgerHint: "Petty Cash Withdrawal",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 30,000 on May 10. Exact same transaction.",
  },
  {
    bankHint: "ONLINE PAYMENT DARAZ",
    ledgerHint: "Daraz.pk Online",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 8,900 on May 10. Same platform.",
  },
  {
    bankHint: "NIFT TRANSFER",
    ledgerHint: "NIFT Payment - Supplier",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 95,000 on May 11. NIFT transfer = NIFT payment.",
  },
  {
    bankHint: "CHEQUE 445521",
    ledgerHint: "Cheque Payment - Office",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 75,000 on May 12. Cheque number reference.",
  },
  {
    bankHint: "UBL FUND TRANSFER",
    ledgerHint: "UBL Fund Transfer - Client",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 42,000 on May 13. Same bank transfer.",
  },
  {
    bankHint: "INSURANCE PREMIUM",
    ledgerHint: "Annual Insurance",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 22,000 on May 14. Insurance premium = annual insurance.",
  },
  {
    bankHint: "FBR TAX PAYMENT",
    ledgerHint: "FBR Income Tax",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 35,000 on May 15. Same tax payment.",
  },
  {
    bankHint: "VENDOR PAYMENT TRF",
    ledgerHint: "Vendor Payment - Raw Materials",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 63,000 on May 15. Vendor payment.",
  },
  {
    bankHint: "CASH DEPOSIT",
    ledgerHint: "Cash Deposit - Daily",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 200,000 on May 16. Cash deposit.",
  },
  {
    bankHint: "PAYROLL BONUS",
    ledgerHint: "Bonus Payment",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 55,000 on May 18. Payroll bonus = bonus payment.",
  },
  {
    bankHint: "CREDIT NOTE REFUND",
    ledgerHint: "Credit Note - Customer Return",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 15,000 on May 19. Credit note refund.",
  },
  {
    bankHint: "OFFICE SUPPLIES",
    ledgerHint: "Office Supplies - Monthly",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 7,200 on May 20. Same purchase.",
  },
  {
    bankHint: "NADRA FEE",
    ledgerHint: "NADRA CNIC Renewal",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 3,500 on May 21. NADRA fee payment.",
  },
  {
    bankHint: "SADAPAY INWARD",
    ledgerHint: "SadaPay Transfer",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 88,000 on May 22. SadaPay transfer.",
  },
  {
    bankHint: "K-ELECTRIC BILL",
    ledgerHint: "K-Electric Bill",
    shouldMatch: true,
    expectedType: "exact",
    notes: "Both PKR 14,200 on May 23. Same electricity bill.",
  },
  {
    bankHint: "ONLINE TRF 990122",
    ledgerHint: "Bank Transfer - Project Delta",
    shouldMatch: true,
    expectedType: "fuzzy",
    notes:
      "Bank: PKR 34,750 on May 4. Ledger: PKR 35,000 on May 5. Amount diff PKR 250, 1-day offset.",
  },
  {
    bankHint: "CHQ DEP 881234",
    ledgerHint: "Cheque Deposit - Vendor XYZ",
    shouldMatch: true,
    expectedType: "near",
    notes: "Both PKR 120,000. Bank: May 6, Ledger: May 7. 1-day offset.",
  },
  {
    bankHint: "POS TXN METRO",
    ledgerHint: "Metro Cash & Carry",
    shouldMatch: true,
    expectedType: "near",
    notes:
      "Both PKR 4,500. Bank: May 7, Ledger: May 7. Names differ significantly.",
  },
  {
    bankHint: "ATM WDL MALL ROAD",
    ledgerHint: "",
    shouldMatch: false,
    expectedType: "none",
    notes: "PKR 15,000 ATM withdrawal. No corresponding ledger entry exists.",
  },
  {
    bankHint: "EASYPAISA REVERSAL",
    ledgerHint: "",
    shouldMatch: false,
    expectedType: "none",
    notes: "PKR 4,500 reversal. No corresponding ledger entry exists.",
  },
  {
    bankHint: "",
    ledgerHint: "Advance Payment - New Supplier",
    shouldMatch: false,
    expectedType: "none",
    notes:
      "PKR 45,000 advance payment. No corresponding bank transaction exists.",
  },
  {
    bankHint: "",
    ledgerHint: "Freelancer Payment - UI Work",
    shouldMatch: false,
    expectedType: "none",
    notes:
      "PKR 28,000 freelancer payment. No corresponding bank transaction exists.",
  },
];

export interface EvaluationResult {
  totalGroundTruth: number;
  totalResults: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  phaseBreakdown: {
    phase: string;
    totalMatched: number;
    correctMatches: number;
    incorrectMatches: number;
    phaseAccuracy: number;
    avgConfidence: number;
  }[];
  confidenceCalibration: {
    range: string;
    totalPairs: number;
    correctPairs: number;
    actualAccuracy: number;
    isCalibrated: boolean;
  }[];
  totalProcessingMs: number;
  rulesProcessingMs: number;
  aiProcessingMs: number;
  baseline: {
    manualTime: string;
    toolTime: string;
    manualAccuracy: number;
    toolAccuracy: number;
    timeSavedPercent: number;
    accuracyDelta: number;
    manualMissRate: number;
    toolMissRate: number;
  };
  details: {
    bankHint: string;
    ledgerHint: string;
    shouldMatch: boolean;
    didMatch: boolean;
    isCorrect: boolean;
    confidence: number | null;
    matchType: string | null;
    notes: string;
  }[];
}

const PHASES = ["exact", "near", "fuzzy", "ai_scored"] as const;

const CONFIDENCE_BUCKETS = [
  { range: "95-100", min: 95, max: 100, midpoint: 97.5 },
  { range: "85-94", min: 85, max: 94.99, midpoint: 89.5 },
  { range: "70-84", min: 70, max: 84.99, midpoint: 77 },
  { range: "below-70", min: 0, max: 69.99, midpoint: 35 },
] as const;

function containsHint(text: string | undefined, hint: string): boolean {
  if (!hint.trim()) return false;
  return (text ?? "").toUpperCase().includes(hint.toUpperCase());
}

function findResultWithBank(
  results: MatchResult[],
  hint: string
): MatchResult | undefined {
  return results.find(
    (r) => r.bankTransaction && containsHint(r.bankTransaction.description, hint)
  );
}

function findResultWithLedger(
  results: MatchResult[],
  hint: string
): MatchResult | undefined {
  return results.find(
    (r) => r.ledgerEntry && containsHint(r.ledgerEntry.description, hint)
  );
}

function isPairedMatch(r: MatchResult): boolean {
  return !!(r.bankTransaction && r.ledgerEntry);
}

function isCorrectGroundTruthPair(
  r: MatchResult,
  groundTruth: GroundTruthEntry[]
): boolean {
  if (!isPairedMatch(r)) return false;
  return groundTruth.some(
    (gt) =>
      gt.shouldMatch &&
      containsHint(r.bankTransaction!.description, gt.bankHint) &&
      containsHint(r.ledgerEntry!.description, gt.ledgerHint)
  );
}

function evaluateGroundTruthEntry(
  results: MatchResult[],
  gt: GroundTruthEntry
): {
  didMatch: boolean;
  isCorrect: boolean;
  confidence: number | null;
  matchType: string | null;
} {
  if (gt.shouldMatch) {
    const bankResult = findResultWithBank(results, gt.bankHint);
    if (!bankResult) {
      return {
        didMatch: false,
        isCorrect: false,
        confidence: null,
        matchType: null,
      };
    }
    const paired = isPairedMatch(bankResult);
    const isCorrect =
      paired && containsHint(bankResult.ledgerEntry?.description, gt.ledgerHint);
    return {
      didMatch: paired,
      isCorrect,
      confidence: paired ? bankResult.confidence : null,
      matchType: paired ? bankResult.matchType : null,
    };
  }

  if (gt.bankHint) {
    const bankResult = findResultWithBank(results, gt.bankHint);
    if (!bankResult) {
      return {
        didMatch: false,
        isCorrect: false,
        confidence: null,
        matchType: null,
      };
    }
    const didMatch = isPairedMatch(bankResult);
    return {
      didMatch,
      isCorrect: !didMatch,
      confidence: didMatch ? bankResult.confidence : null,
      matchType: didMatch ? bankResult.matchType : null,
    };
  }

  const ledgerResult = findResultWithLedger(results, gt.ledgerHint);
  if (!ledgerResult) {
    return {
      didMatch: false,
      isCorrect: false,
      confidence: null,
      matchType: null,
    };
  }
  const didMatch = isPairedMatch(ledgerResult);
  return {
    didMatch,
    isCorrect: !didMatch,
    confidence: didMatch ? ledgerResult.confidence : null,
    matchType: didMatch ? ledgerResult.matchType : null,
  };
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function roundPct(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * 100 * factor) / factor;
}

export function formatToolTime(totalProcessingMs: number): string {
  const sec = totalProcessingMs / 1000;
  if (sec < 60) return `${sec.toFixed(1)} seconds`;
  const min = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${min} min ${rem} sec`;
}

export function evaluateResults(
  results: MatchResult[],
  totalProcessingMs: number,
  aiProcessingMs: number
): EvaluationResult {
  const groundTruth = GROUND_TRUTH;
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  const details = groundTruth.map((gt) => {
    const outcome = evaluateGroundTruthEntry(results, gt);

    if (gt.shouldMatch) {
      if (outcome.isCorrect) truePositives += 1;
      else falseNegatives += 1;
    } else if (outcome.isCorrect) {
      trueNegatives += 1;
    } else {
      falsePositives += 1;
    }

    return {
      bankHint: gt.bankHint,
      ledgerHint: gt.ledgerHint,
      shouldMatch: gt.shouldMatch,
      didMatch: outcome.didMatch,
      isCorrect: outcome.isCorrect,
      confidence: outcome.confidence,
      matchType: outcome.matchType,
      notes: gt.notes,
    };
  });

  const precision = roundPct(
    safeRatio(truePositives, truePositives + falsePositives)
  );
  const recall = roundPct(
    safeRatio(truePositives, truePositives + falseNegatives)
  );
  const f1Score = roundPct(
    safeRatio(2 * precision * recall, precision + recall)
  );
  const accuracy = roundPct(
    safeRatio(
      truePositives + trueNegatives,
      truePositives + trueNegatives + falsePositives + falseNegatives
    )
  );

  const phaseBreakdown = PHASES.map((phase) => {
    const phaseResults = results.filter(
      (r) => r.matchType === phase && isPairedMatch(r)
    );
    const correctMatches = phaseResults.filter((r) =>
      isCorrectGroundTruthPair(r, groundTruth)
    ).length;
    const totalMatched = phaseResults.length;
    const incorrectMatches = totalMatched - correctMatches;
    const avgConfidence =
      totalMatched > 0
        ? Math.round(
            phaseResults.reduce((sum, r) => sum + r.confidence, 0) /
              totalMatched
          )
        : 0;
    return {
      phase,
      totalMatched,
      correctMatches,
      incorrectMatches,
      phaseAccuracy: roundPct(safeRatio(correctMatches, totalMatched)),
      avgConfidence,
    };
  });

  const pairedMatches = results.filter(isPairedMatch);

  const confidenceCalibration = CONFIDENCE_BUCKETS.map((bucket) => {
    const inBucket = pairedMatches.filter(
      (r) => r.confidence >= bucket.min && r.confidence <= bucket.max
    );
    const correctPairs = inBucket.filter((r) =>
      isCorrectGroundTruthPair(r, groundTruth)
    ).length;
    const totalPairs = inBucket.length;
    const actualAccuracy = roundPct(safeRatio(correctPairs, totalPairs));
    const isCalibrated =
      totalPairs === 0 ||
      Math.abs(actualAccuracy - bucket.midpoint) <= 10;
    return {
      range: bucket.range,
      totalPairs,
      correctPairs,
      actualAccuracy,
      isCalibrated,
    };
  });

  const rulesProcessingMs = Math.max(0, totalProcessingMs - aiProcessingMs);
  const manualTimeSeconds = 5 * 60 * 60;
  const toolTimeSeconds = totalProcessingMs / 1000;
  const timeSavedPercent = roundPct(
    safeRatio(manualTimeSeconds - toolTimeSeconds, manualTimeSeconds)
  );
  const toolMissRate = roundPct(
    safeRatio(falseNegatives, truePositives + falseNegatives)
  );

  return {
    totalGroundTruth: groundTruth.length,
    totalResults: results.length,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
    precision,
    recall,
    f1Score,
    accuracy,
    phaseBreakdown,
    confidenceCalibration,
    totalProcessingMs,
    rulesProcessingMs,
    aiProcessingMs,
    baseline: {
      manualTime: "4-6 hours",
      toolTime: formatToolTime(totalProcessingMs),
      manualAccuracy: 93,
      toolAccuracy: accuracy,
      timeSavedPercent,
      accuracyDelta: Math.round((accuracy - 93) * 10) / 10,
      manualMissRate: 6.5,
      toolMissRate,
    },
    details,
  };
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatEvaluationCsvBlock(evaluation: EvaluationResult): string {
  const rows: string[][] = [
    [],
    ["EVALUATION SUMMARY"],
    ["Metric", "Value"],
    ["Precision", `${evaluation.precision}%`],
    ["Recall", `${evaluation.recall}%`],
    ["F1 Score", `${evaluation.f1Score}%`],
    ["Accuracy", `${evaluation.accuracy}%`],
    ["True Positives", String(evaluation.truePositives)],
    ["False Positives", String(evaluation.falsePositives)],
    ["True Negatives", String(evaluation.trueNegatives)],
    ["False Negatives", String(evaluation.falseNegatives)],
    ["Processing Time", evaluation.baseline.toolTime],
    ["Baseline Manual Time", evaluation.baseline.manualTime],
  ];
  return `\n${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}`;
}
