"use client";

import { useEffect, useState } from "react";
import type { MatchResult } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { isAIConfirmedUnmatched } from "@/lib/ai-display";
import { isBankCharge } from "@/lib/transaction-categories";
import { CategoryBadge } from "./ai/CategoryBadge";
import { AnomalyFlagBadge } from "./AnomalyFlagBadge";
import { EmptyState } from "./EmptyState";
import { AmountWithHoverStat } from "./AmountWithHoverStat";

interface UnmatchedListProps {
  results: MatchResult[];
  anomalyMap?: Record<string, string>;
}

function UnmatchedSection({
  title,
  count,
  items,
  source,
  badgeClass,
  borderClass,
  anomalyMap,
  hintMap,
}: {
  title: string;
  count: number;
  items: MatchResult[];
  source: "bank" | "ledger";
  badgeClass: string;
  borderClass: string;
  anomalyMap: Record<string, string>;
  hintMap: Record<string, string>;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => {
            const txn =
              source === "bank" ? r.bankTransaction : r.ledgerEntry;
            if (!txn) return null;
            const aiConfirmed = isAIConfirmedUnmatched(r);
            return (
              <li
                key={r.id}
                className={`card-surface border-l-[3px] p-4 ${borderClass}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                  >
                    {source === "bank" ? "Bank" : "Ledger"}
                  </span>
                  <CategoryBadge description={txn.description} />
                  <span className="flex-1 text-sm text-primary min-w-[12rem]">
                    {source === "bank" && isBankCharge(txn.description) && (
                      <span className="mr-1" title="Bank charge / fee">
                        🏦
                      </span>
                    )}
                    {txn.description}
                  </span>
                  <AmountWithHoverStat
                    amount={txn.amount}
                    source={source}
                    transactionId={txn.id}
                    type={txn.type}
                    className="font-medium text-primary"
                  />
                  <span className="text-xs text-muted">
                    {formatDate(txn.date)}
                  </span>
                  {anomalyMap[r.id] && (
                    <AnomalyFlagBadge reason={anomalyMap[r.id]} />
                  )}
                </div>
                {hintMap[r.id] && (
                  <p className="mt-2 text-xs text-secondary leading-relaxed">
                    💡 {hintMap[r.id]}
                  </p>
                )}
                {aiConfirmed && (
                  <p className="mt-2 text-xs text-accent/80">
                    ✦ AI confirmed: no matching entry found
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function UnmatchedList({
  results,
  anomalyMap = {},
}: UnmatchedListProps) {
  const unmatched = results.filter((r) => r.status === "unmatched");
  const bankOnly = unmatched.filter((r) => r.bankTransaction && !r.ledgerEntry);
  const ledgerOnly = unmatched.filter((r) => r.ledgerEntry && !r.bankTransaction);
  const [hintMap, setHintMap] = useState<Record<string, string>>({});
  const [hintsLoading, setHintsLoading] = useState(false);

  useEffect(() => {
    if (!unmatched.length) {
      setHintMap({});
      return;
    }
    let cancelled = false;
    setHintsLoading(true);
    void fetch("/api/ai/unmatched-hints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: unmatched }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { hints?: { matchId: string; hint: string }[] } | null) => {
        if (cancelled || !data?.hints?.length) return;
        const map: Record<string, string> = {};
        for (const h of data.hints) {
          map[h.matchId] = h.hint;
        }
        setHintMap(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHintsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [results]);

  if (unmatched.length === 0) {
    return (
      <EmptyState
        icon="🎯"
        title="Perfect reconciliation"
        message="Every transaction has a match."
      />
    );
  }

  return (
    <div>
      {hintsLoading && (
        <p className="text-xs text-muted mb-4 animate-pulse-subtle">
          Generating smart suggestions for unmatched items…
        </p>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <UnmatchedSection
          title="Bank Only"
          count={bankOnly.length}
          items={bankOnly}
          source="bank"
          badgeClass="bg-[rgba(56,189,248,0.15)] text-accent"
          borderClass="border-l-[var(--accent)]"
          anomalyMap={anomalyMap}
          hintMap={hintMap}
        />
        <UnmatchedSection
          title="Ledger Only"
          count={ledgerOnly.length}
          items={ledgerOnly}
          source="ledger"
          badgeClass="bg-[rgba(139,92,246,0.15)] text-[var(--purple)]"
          borderClass="border-l-[var(--purple)]"
          anomalyMap={anomalyMap}
          hintMap={hintMap}
        />
      </div>
    </div>
  );
}
