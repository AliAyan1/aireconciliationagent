import type { ReconciliationSummary } from "@/lib/types";
import { formatPKR } from "@/lib/format";

interface StatsCardsProps {
  summary: ReconciliationSummary;
}

export function StatsCards({ summary }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Transactions",
      value: summary.totalBankTxns,
      subtitle: `${summary.totalLedgerEntries} ledger entries`,
      border: "border-l-sky-400",
    },
    {
      label: "Auto Matched",
      value: summary.autoMatched,
      subtitle: `${summary.matchRate}% match rate`,
      border: "border-l-emerald-500",
    },
    {
      label: "Needs Review",
      value: summary.needsReview,
      subtitle: "Awaiting approval",
      border: "border-l-amber-500",
    },
    {
      label: "Posted",
      value: summary.posted ?? 0,
      subtitle: "Journal entries recorded",
      border: "border-l-violet-500",
    },
    {
      label: "Unmatched",
      value: summary.unmatched,
      subtitle: `Diff ${formatPKR(summary.difference)}`,
      border: "border-l-red-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border border-slate-800 bg-slate-900 p-5 border-l-4 ${card.border}`}
        >
          <p className="text-3xl font-bold text-slate-100">{card.value}</p>
          <p className="mt-1 text-sm font-medium text-slate-300">
            {card.label}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
