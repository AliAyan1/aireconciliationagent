"use client";

import type { MatchResult } from "@/lib/types";
import { assessMatchRisk } from "@/lib/risk-score";

const STYLES = {
  low: "bg-[rgba(16,185,129,0.12)] text-[var(--success)] border-[rgba(16,185,129,0.25)]",
  medium:
    "bg-[rgba(245,158,11,0.12)] text-[var(--warning)] border-[rgba(245,158,11,0.25)]",
  high: "bg-[rgba(239,68,68,0.12)] text-[var(--danger)] border-[rgba(239,68,68,0.25)]",
};

const ICONS = { low: "🟢", medium: "🟡", high: "🔴" };

export function RiskBadge({ match }: { match: MatchResult }) {
  const risk = assessMatchRisk(match);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STYLES[risk.level]}`}
      title={risk.reasons.join(" · ")}
    >
      <span aria-hidden>{ICONS[risk.level]}</span>
      {risk.label}
    </span>
  );
}
