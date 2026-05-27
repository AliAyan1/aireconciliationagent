"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { buildAmountMismatchSummary } from "@/lib/amount-mismatch";
import {
  buildCategoryBreakdown,
  summarizeBankCharges,
  type TransactionCategory,
} from "@/lib/transaction-categories";
import { formatPKR } from "@/lib/format";
import { AmountWithHoverStat } from "./AmountWithHoverStat";
import type { MatchResult } from "@/lib/types";

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  "Vendor Payments": "#38bdf8",
  Salary: "#10b981",
  Utilities: "#f59e0b",
  Tax: "#8b5cf6",
  "Bank Charges": "#ef4444",
  Cash: "#64748b",
  Transfers: "#06b6d4",
  "Mobile Wallet": "#ec4899",
  Other: "#94a3b8",
};

interface SessionAnalyticsPanelProps {
  results: MatchResult[];
}

export function SessionAnalyticsPanel({ results }: SessionAnalyticsPanelProps) {
  const mismatch = useMemo(
    () => buildAmountMismatchSummary(results),
    [results]
  );
  const categories = useMemo(
    () => buildCategoryBreakdown(results),
    [results]
  );
  const bankCharges = useMemo(
    () => summarizeBankCharges(results),
    [results]
  );

  const pieData = categories.map((c) => ({
    name: c.category,
    value: c.amount,
    percent: c.percent,
  }));

  const periodLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="no-print mt-8 space-y-6" aria-label="Session analytics">
      <div>
        <h2 className="text-lg font-semibold text-primary">Data &amp; analytics</h2>
        <p className="text-sm text-muted mt-1">
          Amount mismatches, spending categories, and bank charges for this session
        </p>
      </div>

      {mismatch.count > 0 && (
        <div className="card-surface p-4 sm:p-5 border-l-[3px] border-l-[var(--warning)]">
          <h3 className="text-sm font-semibold text-primary">
            Amount mismatch analysis
          </h3>
          <p className="mt-2 text-sm text-secondary leading-relaxed">
            {mismatch.narrative}
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted max-h-32 overflow-y-auto">
            {mismatch.rows.slice(0, 5).map((r) => (
              <li key={r.id} className="flex justify-between gap-2 tabular-nums">
                <span className="truncate">{r.description}</span>
                <span className="text-[var(--warning)] shrink-0">
                  {formatPKR(r.difference)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-primary mb-1">
            Category breakdown
          </h3>
          <p className="text-xs text-muted mb-4">
            Auto-tagged from transaction descriptions
          </p>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted">No transactions to categorize.</p>
          ) : (
            <>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            CATEGORY_COLORS[entry.name as TransactionCategory] ??
                            "#94a3b8"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0];
                        const value = Number(item.value ?? 0);
                        return (
                          <div
                            className="rounded-lg border border-default bg-elevated px-3 py-2 text-xs text-primary shadow-lg"
                          >
                            <p className="font-medium">{item.name}</p>
                            <p>{formatPKR(value)}</p>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-secondary">
                {categories.slice(0, 5).map((c) => (
                  <li key={c.category}>
                    {c.percent}% {c.category}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card-surface p-4 sm:p-5 border-l-[3px] border-l-[var(--accent)]">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <span aria-hidden>🏦</span> Bank charges
          </h3>
          <p className="mt-3 text-2xl font-bold text-primary">
            <AmountWithHoverStat
              amount={bankCharges.total}
              source="bank"
              className="text-2xl font-bold"
            >
              {formatPKR(bankCharges.total)}
            </AmountWithHoverStat>
          </p>
          <p className="text-xs text-muted mt-1">
            Total bank charges this period ({periodLabel}) · {bankCharges.count}{" "}
            transaction{bankCharges.count === 1 ? "" : "s"}
          </p>
          {bankCharges.items.length > 0 && (
            <ul className="mt-4 space-y-2 text-xs">
              {bankCharges.items.slice(0, 6).map((item, i) => (
                <li
                  key={`${item.date}-${i}`}
                  className="flex items-start gap-2 text-secondary"
                >
                  <span className="shrink-0" aria-hidden>
                    🏦
                  </span>
                  <span className="flex-1 truncate">{item.description}</span>
                  <AmountWithHoverStat
                    amount={item.amount}
                    source="bank"
                    transactionId={item.id}
                    type={item.type}
                    className="shrink-0 font-medium"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
