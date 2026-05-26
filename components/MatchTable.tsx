"use client";

import { Fragment, useMemo, useState } from "react";
import type { MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { getMatchAIReasoning, isMatchAIScored } from "@/lib/ai-display";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EmptyState } from "./EmptyState";
import { MatchTypeBadge } from "./MatchTypeBadge";

interface MatchTableProps {
  results: MatchResult[];
  expandedId?: string | null;
  onExpandedChange?: (id: string | null) => void;
  hideSearch?: boolean;
}

function StatusPill({ status }: { status: MatchResult["status"] }) {
  if (status === "posted") {
    return (
      <span className="rounded-full bg-[rgba(139,92,246,0.2)] px-2.5 py-0.5 text-xs font-medium text-[var(--purple)]">
        Posted
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[rgba(16,185,129,0.2)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
      Auto Matched
    </span>
  );
}

export function MatchTable({
  results,
  expandedId: controlledExpanded,
  onExpandedChange,
  hideSearch = false,
}: MatchTableProps) {
  const [localQuery, setLocalQuery] = useState("");
  const [localExpanded, setLocalExpanded] = useState<string | null>(null);

  const expandedId =
    controlledExpanded !== undefined ? controlledExpanded : localExpanded;
  const setExpandedId = onExpandedChange ?? setLocalExpanded;

  const filtered = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    if (hideSearch || !q) return results;
    return results.filter((r) => {
      const bank = r.bankTransaction?.description.toLowerCase() ?? "";
      const ledger = r.ledgerEntry?.description.toLowerCase() ?? "";
      return bank.includes(q) || ledger.includes(q);
    });
  }, [results, localQuery, hideSearch]);

  if (results.length === 0) {
    return (
      <EmptyState
        icon="✓"
        title="No auto-matched transactions"
        message="Try adjusting the matching threshold or upload files with clearer descriptions."
      />
    );
  }

  return (
    <div className="space-y-4">
      {!hideSearch && (
        <input
          type="search"
          placeholder="Filter by description…"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="input-field w-full max-w-md px-4 py-2.5 text-sm"
          aria-label="Filter matches by description"
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-default -mx-4 sm:mx-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-elevated text-secondary text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Bank Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Ledger Description</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const aiScored = isMatchAIScored(r);
              const reasoning = getMatchAIReasoning(r);
              const expanded = expandedId === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                    className={`cursor-pointer border-t border-default transition-colors duration-200 ${
                      r.matchType === "ai_scored" || aiScored
                        ? "bg-[rgba(56,189,248,0.06)] hover:bg-card-hover"
                        : idx % 2 === 0
                          ? "bg-card hover:bg-card-hover"
                          : "bg-primary hover:bg-card-hover"
                    }`}
                  >
                    <td className="sticky left-0 z-[1] bg-inherit px-4 py-3 text-muted tabular-nums shadow-[2px_0_8px_rgba(0,0,0,0.15)]">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-primary max-w-[200px] truncate">
                      {r.bankTransaction?.description}
                    </td>
                    <td className="px-4 py-3 text-right text-primary tabular-nums font-medium">
                      {r.bankTransaction
                        ? formatPKR(r.bankTransaction.amount)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-primary max-w-[200px] truncate">
                      {r.ledgerEntry?.description}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {r.bankTransaction
                        ? formatDate(r.bankTransaction.date)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge
                        confidence={r.confidence}
                        isAIScored={aiScored}
                        aiReasoning={reasoning}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MatchTypeBadge matchType={r.matchType} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${r.id}-detail`} className="bg-elevated">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid gap-4 md:grid-cols-2 text-sm">
                          <div className="rounded-lg bg-input p-4 border border-default">
                            <p className="text-xs text-muted mb-2">
                              🏦 Bank
                            </p>
                            <p className="font-medium text-primary">
                              {r.bankTransaction?.description}
                            </p>
                            <p className="mt-1 text-secondary tabular-nums">
                              {r.bankTransaction &&
                                formatPKR(r.bankTransaction.amount)}{" "}
                              ·{" "}
                              {r.bankTransaction &&
                                formatDate(r.bankTransaction.date)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-input p-4 border border-default">
                            <p className="text-xs text-muted mb-2">
                              📒 Ledger
                            </p>
                            <p className="font-medium text-primary">
                              {r.ledgerEntry?.description}
                            </p>
                            <p className="mt-1 text-secondary tabular-nums">
                              {r.ledgerEntry &&
                                formatPKR(r.ledgerEntry.amount)}{" "}
                              ·{" "}
                              {r.ledgerEntry &&
                                formatDate(r.ledgerEntry.date)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted">
                          {r.matchReason}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
