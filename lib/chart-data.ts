import { isMatchAIScored } from "./ai-display";
import type { MatchResult } from "./types";

export const CHART_COLORS = {
  autoMatched: "#10b981",
  needsReview: "#f59e0b",
  unmatched: "#ef4444",
  exact: "#10b981",
  near: "#3b82f6",
  fuzzy: "#8b5cf6",
  ai: "#38bdf8",
  confidenceBar: "#38bdf8",
  grid: "rgba(148, 163, 184, 0.12)",
  axis: "#64748b",
  tooltipBg: "#141e33",
  tooltipBorder: "rgba(148, 163, 184, 0.2)",
} as const;

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
    { name: "Auto matched", value: autoMatched, fill: CHART_COLORS.autoMatched },
    { name: "Needs review", value: needsReview, fill: CHART_COLORS.needsReview },
    { name: "Unmatched", value: unmatched, fill: CHART_COLORS.unmatched },
  ].filter((d) => d.value > 0);
}

export function buildPhaseBarData(results: MatchResult[]) {
  const counts = { exact: 0, near: 0, fuzzy: 0, ai: 0 };

  for (const r of results) {
    if (r.status === "unmatched" || r.matchType === "unmatched") continue;
    if (r.matchType === "exact") counts.exact++;
    else if (r.matchType === "near") counts.near++;
    else if (r.matchType === "fuzzy") counts.fuzzy++;
    else if (r.matchType === "ai_scored" || isMatchAIScored(r)) counts.ai++;
  }

  return [
    { phase: "Exact", count: counts.exact, fill: CHART_COLORS.exact },
    { phase: "Near date", count: counts.near, fill: CHART_COLORS.near },
    { phase: "Fuzzy", count: counts.fuzzy, fill: CHART_COLORS.fuzzy },
    { phase: "AI scored", count: counts.ai, fill: CHART_COLORS.ai },
  ];
}

const CONFIDENCE_BUCKETS = [
  { label: "0–49", min: 0, max: 49 },
  { label: "50–59", min: 50, max: 59 },
  { label: "60–69", min: 60, max: 69 },
  { label: "70–79", min: 70, max: 79 },
  { label: "80–89", min: 80, max: 89 },
  { label: "90–100", min: 90, max: 100 },
] as const;

export function buildConfidenceHistogram(results: MatchResult[]) {
  const buckets = CONFIDENCE_BUCKETS.map((b) => ({
    range: b.label,
    count: 0,
    fill: CHART_COLORS.confidenceBar,
  }));

  for (const r of results) {
    if (r.status === "unmatched" && r.confidence === 0) continue;
    const c = Math.min(100, Math.max(0, Math.round(r.confidence)));
    const idx = CONFIDENCE_BUCKETS.findIndex((b) => c >= b.min && c <= b.max);
    if (idx >= 0) buckets[idx].count++;
  }

  return buckets;
}
