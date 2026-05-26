"use client";

import type { ReconciliationSummary } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

interface StatsCardsProps {
  summary: ReconciliationSummary;
  aiScoredCount?: number;
  showAIStat?: boolean;
  animate?: boolean;
}

function StatValue({
  value,
  animate,
  className,
}: {
  value: number;
  animate: boolean;
  className: string;
}) {
  const display = useAnimatedNumber(value, 800, animate);
  return (
    <p className={`text-2xl sm:text-[32px] font-bold tabular-nums leading-none ${className}`}>
      {display}
    </p>
  );
}

export function StatsCards({
  summary,
  aiScoredCount = 0,
  showAIStat = false,
  animate = true,
}: StatsCardsProps) {
  const cards: {
    label: string;
    value: number;
    subtitle: string;
    accent: string;
    valueColor: string;
    animateValue: boolean;
  }[] = [
    {
      label: "Total Transactions",
      value: summary.totalBankTxns,
      subtitle: `${summary.totalLedgerEntries} ledger entries`,
      accent: "border-l-[var(--accent)]",
      valueColor: "text-accent",
      animateValue: true,
    },
    {
      label: "Auto Matched",
      value: summary.autoMatched,
      subtitle: `${summary.matchRate}% match rate`,
      accent: "border-l-[var(--success)]",
      valueColor: "text-[var(--success)]",
      animateValue: true,
    },
    {
      label: "Needs Review",
      value: summary.needsReview,
      subtitle: "Awaiting approval",
      accent: "border-l-[var(--warning)]",
      valueColor: "text-[var(--warning)]",
      animateValue: true,
    },
    {
      label: "Posted",
      value: summary.posted ?? 0,
      subtitle: "Journal entries recorded",
      accent: "border-l-[var(--purple)]",
      valueColor: "text-[var(--purple)]",
      animateValue: false,
    },
    {
      label: "Unmatched",
      value: summary.unmatched,
      subtitle: `Diff ${formatPKR(summary.difference)}`,
      accent: "border-l-[var(--danger)]",
      valueColor: "text-[var(--danger)]",
      animateValue: true,
    },
  ];

  if (showAIStat && aiScoredCount > 0) {
    cards.push({
      label: "AI Scored",
      value: aiScoredCount,
      subtitle: "by GPT-4o-mini",
      accent: "border-l-[var(--accent)]",
      valueColor: "text-accent",
      animateValue: true,
    });
  }

  const gridClass =
    showAIStat && aiScoredCount > 0
      ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

  return (
    <div className={`grid gap-3 sm:gap-4 ${gridClass}`}>
      {cards.map((card) => (
        <div
          key={card.label}
          className={`card-surface border-l-[3px] p-4 sm:p-5 hover:-translate-y-0.5 hover:border-hover ${card.accent}`}
        >
          <StatValue
            value={card.value}
            animate={animate && card.animateValue}
            className={card.valueColor}
          />
          <p className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-secondary">
            {card.label}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-muted">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
