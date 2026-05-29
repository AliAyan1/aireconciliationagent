"use client";

import { formatPKR } from "@/lib/format";
import { getAmountHoverLines } from "@/lib/amount-hover-stats";
import { useAmountHoverContext } from "./AmountHoverProvider";

interface AmountWithHoverStatProps {
  amount: number;
  source: "bank" | "ledger";
  transactionId?: string;
  type?: "debit" | "credit";
  className?: string;
  children?: React.ReactNode;
}

export function AmountWithHoverStat({
  amount,
  source,
  transactionId,
  type,
  className = "",
  children,
}: AmountWithHoverStatProps) {
  const { bank, ledger } = useAmountHoverContext();
  const index = source === "bank" ? bank : ledger;

  const lines =
    index && amount > 0
      ? getAmountHoverLines(index, amount, {
          transactionId,
          type,
          entityLabel:
            source === "bank" ? "bank transactions" : "ledger entries",
        })
      : [];

  const label = children ?? formatPKR(amount);
  const tone = amount < 0 ? "text-[var(--danger)]" : "text-primary";

  if (lines.length === 0) {
    return (
      <span className={`font-mono tabular-nums ${tone} ${className}`.trim()}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={`no-print relative inline-block group/amt ${className}`.trim()}
    >
      <span className="cursor-help border-b border-dotted border-[var(--text-muted)]/50">
        <span className={`font-mono tabular-nums ${tone}`.trim()}>{label}</span>
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[60] w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-default bg-elevated px-2.5 py-2 text-[11px] leading-snug text-secondary opacity-0 shadow-lg transition-opacity duration-150 group-hover/amt:opacity-100 invisible group-hover/amt:visible"
      >
        {lines.map((line) => (
          <span key={line} className="block text-primary/90">
            {line}
          </span>
        ))}
        <span
          className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--bg-elevated)]"
          aria-hidden
        />
      </span>
    </span>
  );
}
