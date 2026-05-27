import { isMatchAIScored } from "./ai-display";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
  ReconciliationSummary,
} from "./types";

export const CHART_COLORS = {
  autoMatched: "#10b981",
  needsReview: "#f59e0b",
  unmatched: "#ef4444",
  exact: "#10b981",
  near: "#3b82f6",
  fuzzy: "#f59e0b",
  ai: "#8b5cf6",
  bankLine: "#38bdf8",
  ledgerLine: "#8b5cf6",
  confidenceBar: "#38bdf8",
  grid: "rgba(148, 163, 184, 0.12)",
  axis: "#64748b",
  tooltipBg: "#141e33",
  tooltipBorder: "rgba(148, 163, 184, 0.2)",
} as const;

export function computeMatchRatePercent(results: MatchResult[]): number {
  if (results.length === 0) return 0;
  const matched = results.filter(
    (r) =>
      r.status === "auto_matched" ||
      r.status === "posted" ||
      r.status === "approved"
  ).length;
  return Math.round((matched / results.length) * 100);
}

export function buildStatusDonutData(results: MatchResult[]) {
  let autoMatched = 0;
  let needsReview = 0;
  let unmatched = 0;

  for (const r of results) {
    if (r.status === "auto_matched" || r.status === "posted") {
      autoMatched++;
    } else if (r.status === "unmatched") {
      unmatched++;
    } else if (
      r.status === "review" ||
      r.status === "approved" ||
      r.status === "rejected"
    ) {
      needsReview++;
    }
  }

  return [
    { name: "Auto Matched", value: autoMatched, fill: CHART_COLORS.autoMatched },
    { name: "Needs Review", value: needsReview, fill: CHART_COLORS.needsReview },
    { name: "Unmatched", value: unmatched, fill: CHART_COLORS.unmatched },
  ].filter((d) => d.value > 0);
}

export function buildPhaseStackedRow(results: MatchResult[]) {
  const counts = { exact: 0, near: 0, fuzzy: 0, ai: 0 };

  for (const r of results) {
    if (r.status === "unmatched" || r.matchType === "unmatched") continue;
    if (r.matchType === "exact") counts.exact++;
    else if (r.matchType === "near") counts.near++;
    else if (r.matchType === "fuzzy") counts.fuzzy++;
    else if (r.matchType === "ai_scored" || isMatchAIScored(r)) counts.ai++;
  }

  return [
    {
      label: "Matches by phase",
      exact: counts.exact,
      near: counts.near,
      fuzzy: counts.fuzzy,
      ai: counts.ai,
    },
  ];
}

/** @deprecated use buildPhaseStackedRow */
export function buildPhaseBarData(results: MatchResult[]) {
  const row = buildPhaseStackedRow(results)[0];
  return [
    { phase: "Exact", count: row.exact, fill: CHART_COLORS.exact },
    { phase: "Near", count: row.near, fill: CHART_COLORS.near },
    { phase: "Fuzzy", count: row.fuzzy, fill: CHART_COLORS.fuzzy },
    { phase: "AI", count: row.ai, fill: CHART_COLORS.ai },
  ];
}

export function buildConfidenceHistogram(results: MatchResult[]) {
  const buckets = Array.from({ length: 10 }, (_, i) => {
    const min = i * 10;
    const max = min + (i === 9 ? 10 : 9);
    return {
      range: i === 9 ? "90–100" : `${min}–${max}`,
      count: 0,
      fill: CHART_COLORS.confidenceBar,
    };
  });

  for (const r of results) {
    if (r.status === "unmatched" && r.confidence === 0) continue;
    const c = Math.min(100, Math.max(0, Math.round(r.confidence)));
    const idx = c >= 100 ? 9 : Math.floor(c / 10);
    buckets[idx].count++;
  }

  return buckets;
}

export function statusColor(status: MatchResult["status"]): string {
  if (status === "auto_matched" || status === "posted" || status === "approved")
    return CHART_COLORS.autoMatched;
  if (status === "unmatched") return CHART_COLORS.unmatched;
  return CHART_COLORS.needsReview;
}

export function buildAmountChartData(results: MatchResult[], limit = 60) {
  const rows = results
    .filter((r) => r.bankTransaction)
    .map((r) => ({
      id: r.id.slice(0, 6),
      amount: r.bankTransaction!.amount,
      status: r.status,
      fill: statusColor(r.status),
    }))
    .sort((a, b) => a.amount - b.amount)
    .slice(-limit);

  return rows.map((r, i) => ({ ...r, index: i + 1 }));
}

export function buildTimelineData(
  bankData: BankTransaction[],
  ledgerData: LedgerEntry[]
) {
  const counts = new Map<string, { date: string; bank: number; ledger: number }>();

  const add = (date: string, key: "bank" | "ledger") => {
    const day = date.slice(0, 10);
    const row = counts.get(day) ?? { date: day, bank: 0, ledger: 0 };
    row[key]++;
    counts.set(day, row);
  };

  for (const b of bankData) add(b.date, "bank");
  for (const l of ledgerData) add(l.date, "ledger");

  return [...counts.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface SankeyFlow {
  id: string;
  label: string;
  value: number;
  color: string;
}

export function buildSankeyFlows(results: MatchResult[]): SankeyFlow[] {
  const bankTotal = results.filter((r) => r.bankTransaction).length;
  const flows: SankeyFlow[] = [
    { id: "bank", label: "Bank transactions", value: bankTotal, color: CHART_COLORS.bankLine },
  ];

  let exact = 0,
    near = 0,
    fuzzy = 0,
    ai = 0,
    unmatched = 0,
    ledger = 0;

  for (const r of results) {
    if (!r.bankTransaction) continue;
    if (r.status === "unmatched") {
      unmatched++;
      continue;
    }
    if (r.ledgerEntry) ledger++;
    if (r.matchType === "exact") exact++;
    else if (r.matchType === "near") near++;
    else if (r.matchType === "fuzzy") fuzzy++;
    else if (r.matchType === "ai_scored" || isMatchAIScored(r)) ai++;
  }

  flows.push(
    { id: "exact", label: "Exact match", value: exact, color: CHART_COLORS.exact },
    { id: "near", label: "Near date", value: near, color: CHART_COLORS.near },
    { id: "fuzzy", label: "Fuzzy", value: fuzzy, color: CHART_COLORS.fuzzy },
    { id: "ai", label: "AI scored", value: ai, color: CHART_COLORS.ai },
    { id: "unmatched", label: "Unmatched", value: unmatched, color: CHART_COLORS.unmatched },
    { id: "ledger", label: "Ledger entries", value: ledger, color: CHART_COLORS.ledgerLine }
  );

  return flows.filter((f) => f.value > 0);
}

export function buildTreemapData(results: MatchResult[], max = 40) {
  return results
    .filter((r) => r.bankTransaction && r.bankTransaction.amount > 0)
    .map((r) => ({
      name: r.bankTransaction!.description.slice(0, 24),
      size: Math.abs(r.bankTransaction!.amount),
      fill: statusColor(r.status),
      status: r.status,
      amount: r.bankTransaction!.amount,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, max);
}

export function buildBeforeAfterData(results: MatchResult[]) {
  const withAi = results.filter(
    (r) => r.matchType === "ai_scored" || isMatchAIScored(r)
  ).length;
  const total = results.length || 1;
  const auto = results.filter(
    (r) => r.status === "auto_matched" || r.status === "posted"
  ).length;
  const review = results.filter((r) => r.status === "review").length;

  const beforeAuto = Math.max(0, auto - withAi);
  const beforeReview = review + withAi;
  const beforeRate = Math.round((beforeAuto / total) * 100);
  const afterRate = Math.round((auto / total) * 100);

  return [
    {
      metric: "Auto matched",
      before: beforeAuto,
      after: auto,
    },
    {
      metric: "In review",
      before: beforeReview,
      after: review,
    },
    {
      metric: "Match rate %",
      before: beforeRate,
      after: afterRate,
    },
  ];
}

export function buildHeatmapSample(
  results: MatchResult[],
  maxBank = 12,
  maxLedger = 12
) {
  const bankRows = results.filter((r) => r.bankTransaction).slice(0, maxBank);
  const ledgerRows = results
    .filter((r) => r.ledgerEntry)
    .map((r) => r.ledgerEntry!)
    .slice(0, maxLedger);

  const banks = bankRows.map((r, i) => ({
    i,
    id: r.id,
    label: `B${i + 1}`,
    ledgerId: r.ledgerEntry?.id,
  }));
  const ledgers = ledgerRows.map((e, i) => ({
    i,
    id: e.id,
    label: `L${i + 1}`,
  }));

  const cells: {
    bank: number;
    ledger: number;
    confidence: number;
    matched: boolean;
  }[] = [];

  for (let bi = 0; bi < banks.length; bi++) {
    const br = bankRows[bi];
    for (let li = 0; li < ledgers.length; li++) {
      const le = ledgerRows[li];
      let confidence = 8;
      let matched = false;
      if (br.ledgerEntry?.id === le.id) {
        confidence = br.confidence;
        matched = true;
      } else if (br.bankTransaction && le) {
        const diff = Math.abs(br.bankTransaction.amount - le.amount);
        confidence = Math.max(5, 50 - Math.min(45, diff / 1000));
      }
      cells.push({ bank: bi, ledger: li, confidence, matched });
    }
  }

  return { banks, ledgers, cells };
}

export function buildSparklineTrend(
  results: MatchResult[],
  field: "matched" | "unmatched"
): number[] {
  const byDate = new Map<string, number>();
  for (const r of results) {
    const d = r.bankTransaction?.date?.slice(0, 10) ?? "unknown";
    const isMatch =
      field === "matched"
        ? r.status === "auto_matched" || r.status === "posted"
        : r.status === "unmatched";
    if (!isMatch) continue;
    byDate.set(d, (byDate.get(d) ?? 0) + 1);
  }
  const series = [...byDate.values()];
  if (series.length >= 2) return series.slice(-8);
  const base = field === "matched" ? 3 : 2;
  return [base, base + 1, base, base + 2, base + 1, base + 3];
}

export function topConfidenceMatches(results: MatchResult[], n = 8) {
  return [...results]
    .filter((r) => r.status !== "unmatched" && r.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, n);
}
