import {
  getField,
  parseAmount,
  parseBankCSV,
  parseCsvTable,
  parseLedgerCSV,
} from "./normalizer";
import { getSummary, runMatching } from "./matcher";
import type { BankTransaction, LedgerEntry, MatchResult } from "./types";

export interface TestRunIssue {
  type: "warning" | "error";
  message: string;
}

export interface TestRunResult {
  datasetName: string;
  bankRows: number;
  ledgerRows: number;
  processingTimeMs: number;
  totalMatches: number;
  autoMatched: number;
  needsReview: number;
  unmatched: number;
  matchRate: number;
  exactMatches: number;
  nearMatches: number;
  fuzzyMatches: number;
  aiMatches: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  issues: TestRunIssue[];
}

function emptyResult(
  datasetName: string,
  issues: TestRunIssue[],
  processingTimeMs: number
): TestRunResult {
  return {
    datasetName,
    bankRows: 0,
    ledgerRows: 0,
    processingTimeMs,
    totalMatches: 0,
    autoMatched: 0,
    needsReview: 0,
    unmatched: 0,
    matchRate: 0,
    exactMatches: 0,
    nearMatches: 0,
    fuzzyMatches: 0,
    aiMatches: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    issues,
  };
}

function classifyRawDateFormat(value: string): string {
  const v = value.trim();
  if (!v) return "empty";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return "iso";
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(v)) return "dmy";
  if (/^[A-Za-z]{3,}\s+\d{1,2}/.test(v)) return "named";
  return "other";
}

function preflightCsv(
  label: "Bank" | "Ledger",
  csvText: string,
  issues: TestRunIssue[]
): { rowCount: number; hasData: boolean } {
  const trimmed = csvText.trim();
  if (!trimmed) {
    issues.push({
      type: "error",
      message: `${label} CSV is empty.`,
    });
    return { rowCount: 0, hasData: false };
  }

  const { data, errors } = parseCsvTable(csvText);
  if (errors.length > 0) {
    issues.push({
      type: "warning",
      message: `${label} CSV parse warnings: ${errors[0].message}`,
    });
  }

  if (data.length === 0) {
    issues.push({
      type: "error",
      message: `${label} file has headers only — no data rows.`,
    });
    return { rowCount: 0, hasData: false };
  }

  let emptyDescriptions = 0;
  let negativeAmounts = 0;
  const dateFormats = new Set<string>();

  for (const row of data) {
    const desc = getField(row, ["description", "Description"]);
    if (!desc.trim()) emptyDescriptions += 1;

    const dateRaw = getField(row, ["date", "Date", "transaction_date"]);
    dateFormats.add(classifyRawDateFormat(dateRaw));

    if (label === "Bank") {
      const debit = parseAmount(getField(row, ["debit", "Debit"]) || row.Debit);
      const credit = parseAmount(
        getField(row, ["credit", "Credit"]) || row.Credit
      );
      const amt = debit ?? credit;
      if (amt !== null && amt < 0) negativeAmounts += 1;
    } else {
      const amt = parseAmount(getField(row, ["amount", "Amount"]) || row.Amount);
      if (amt !== null && amt < 0) negativeAmounts += 1;
    }
  }

  if (emptyDescriptions > 0) {
    issues.push({
      type: "warning",
      message: `${emptyDescriptions} ${label.toLowerCase()} row(s) have empty descriptions`,
    });
  }

  if (negativeAmounts > 0) {
    issues.push({
      type: "warning",
      message: `${negativeAmounts} ${label.toLowerCase()} amount(s) are negative`,
    });
  }

  const meaningfulFormats = [...dateFormats].filter((f) => f !== "empty");
  if (meaningfulFormats.length > 1) {
    issues.push({
      type: "warning",
      message: `${label} date formats are inconsistent (${meaningfulFormats.join(", ")})`,
    });
  }

  return { rowCount: data.length, hasData: true };
}

function collectResultIssues(
  results: MatchResult[],
  bankTxns: BankTransaction[],
  ledgerEntries: LedgerEntry[],
  issues: TestRunIssue[]
): void {
  const paired = results.filter((r) => r.bankTransaction && r.ledgerEntry);
  const totalMatches = paired.length;

  if (bankTxns.length > 0 && ledgerEntries.length > 0 && totalMatches === 0) {
    issues.push({
      type: "error",
      message: "No matches found at all",
    });
  }

  const bankCount = bankTxns.length;
  if (
    bankCount > 0 &&
    bankCount >= 3 &&
    paired.length === bankCount &&
    results.every(
      (r) =>
        !r.bankTransaction ||
        (r.status === "auto_matched" && r.matchType === "exact")
    )
  ) {
    issues.push({
      type: "warning",
      message: "All transactions matched — suspiciously perfect",
    });
  }

  const ledgerUse = new Map<string, number>();
  for (const r of paired) {
    const id = r.ledgerEntry!.id;
    ledgerUse.set(id, (ledgerUse.get(id) ?? 0) + 1);
  }
  const duplicateLedger = [...ledgerUse.values()].filter((c) => c > 1).length;
  if (duplicateLedger > 0) {
    issues.push({
      type: "error",
      message: `Multiple transactions matched to same ledger entry (${duplicateLedger} ledger row(s) reused)`,
    });
  }

  const fuzzyCount = results.filter(
    (r) => r.matchType === "fuzzy" && r.bankTransaction && r.ledgerEntry
  ).length;
  if (fuzzyCount > 5) {
    issues.push({
      type: "warning",
      message: `Amount tolerance caught ${fuzzyCount} matches — consider reviewing`,
    });
  }
}

function countPhases(results: MatchResult[]) {
  const paired = results.filter((r) => r.bankTransaction && r.ledgerEntry);
  return {
    exactMatches: paired.filter((r) => r.matchType === "exact").length,
    nearMatches: paired.filter((r) => r.matchType === "near").length,
    fuzzyMatches: paired.filter((r) => r.matchType === "fuzzy").length,
    aiMatches: paired.filter((r) => r.matchType === "ai_scored").length,
  };
}

function countConfidence(results: MatchResult[]) {
  const paired = results.filter((r) => r.bankTransaction && r.ledgerEntry);
  return {
    highConfidence: paired.filter((r) => r.confidence > 90).length,
    mediumConfidence: paired.filter(
      (r) => r.confidence >= 70 && r.confidence <= 90
    ).length,
    lowConfidence: paired.filter((r) => r.confidence < 70).length,
  };
}

export function runTestSuite(
  bankCSV: string,
  ledgerCSV: string,
  datasetName: string
): TestRunResult {
  const start = Date.now();
  const issues: TestRunIssue[] = [];

  const bankPreflight = preflightCsv("Bank", bankCSV, issues);
  const ledgerPreflight = preflightCsv("Ledger", ledgerCSV, issues);

  if (!bankPreflight.hasData || !ledgerPreflight.hasData) {
    return emptyResult(datasetName, issues, Date.now() - start);
  }

  let bankTxns: BankTransaction[] = [];
  let ledgerEntries: LedgerEntry[] = [];

  try {
    bankTxns = parseBankCSV(bankCSV);
  } catch (error) {
    issues.push({
      type: "error",
      message:
        error instanceof Error
          ? `Bank CSV failed to parse: ${error.message}`
          : "Bank CSV failed to parse",
    });
    return emptyResult(datasetName, issues, Date.now() - start);
  }

  try {
    ledgerEntries = parseLedgerCSV(ledgerCSV);
  } catch (error) {
    issues.push({
      type: "error",
      message:
        error instanceof Error
          ? `Ledger CSV failed to parse: ${error.message}`
          : "Ledger CSV failed to parse",
    });
    return {
      ...emptyResult(datasetName, issues, Date.now() - start),
      bankRows: bankTxns.length,
    };
  }

  const matchStart = Date.now();
  const results = runMatching(bankTxns, ledgerEntries);
  const processingTimeMs = Date.now() - start;

  collectResultIssues(results, bankTxns, ledgerEntries, issues);

  const summary = getSummary(results, bankTxns, ledgerEntries);
  const phases = countPhases(results);
  const confidence = countConfidence(results);
  const paired = results.filter((r) => r.bankTransaction && r.ledgerEntry);

  return {
    datasetName,
    bankRows: bankTxns.length,
    ledgerRows: ledgerEntries.length,
    processingTimeMs,
    totalMatches: paired.length,
    autoMatched: summary.autoMatched,
    needsReview: summary.needsReview,
    unmatched: summary.unmatched,
    matchRate: summary.matchRate,
    ...phases,
    ...confidence,
    issues,
  };
}
