"use client";

import { useCallback, useState } from "react";
import type { MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { CategoryBadge } from "./ai/CategoryBadge";
import { AnomalyFlagBadge } from "./AnomalyFlagBadge";
import { EmptyState } from "./EmptyState";

interface DragToMatchUnmatchedProps {
  results: MatchResult[];
  anomalyMap?: Record<string, string>;
  hintMap?: Record<string, string>;
  onManualMatch: (bankId: string, ledgerId: string) => void;
}

export function DragToMatchUnmatched({
  results,
  anomalyMap = {},
  hintMap = {},
  onManualMatch,
}: DragToMatchUnmatchedProps) {
  const [draggingBankId, setDraggingBankId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [justMatchedIds, setJustMatchedIds] = useState<Set<string>>(new Set());

  const bankOnly = results.filter(
    (r) => r.status === "unmatched" && r.bankTransaction && !r.ledgerEntry
  );
  const ledgerOnly = results.filter(
    (r) => r.status === "unmatched" && r.ledgerEntry && !r.bankTransaction
  );

  const handleDrop = useCallback(
    (ledgerId: string) => {
      if (!draggingBankId) return;
      setJustMatchedIds((prev) => new Set([...prev, draggingBankId, ledgerId]));
      onManualMatch(draggingBankId, ledgerId);
      setDraggingBankId(null);
      setDropTargetId(null);
    },
    [draggingBankId, onManualMatch]
  );

  if (!bankOnly.length && !ledgerOnly.length) {
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
      {draggingBankId && (
        <p className="mb-4 rounded-lg bg-sky-500/10 border border-sky-400/40 px-4 py-2 text-sm text-sky-300 text-center animate-pulse-subtle">
          Drop onto a Ledger-only item to create a manual match
        </p>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Bank-only column — draggable */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-primary">Bank Only</h3>
            <span className="rounded-full bg-sky-500/15 text-accent px-2.5 py-0.5 text-xs font-medium">
              {bankOnly.length}
            </span>
            {!bankOnly.length && (
              <span className="text-xs text-muted">None</span>
            )}
          </div>
          {bankOnly.length === 0 ? (
            <p className="text-sm text-muted">None</p>
          ) : (
            <ul className="space-y-2">
              {bankOnly.map((r) => {
                const txn = r.bankTransaction!;
                const dragging = draggingBankId === r.id;
                const matched = justMatchedIds.has(r.id);
                return (
                  <li
                    key={r.id}
                    draggable
                    onDragStart={() => setDraggingBankId(r.id)}
                    onDragEnd={() => {
                      setDraggingBankId(null);
                      setDropTargetId(null);
                    }}
                    className={`card-surface border-l-[3px] p-4 cursor-grab select-none transition-all ${
                      matched
                        ? "border-l-emerald-500 bg-emerald-500/10 opacity-60"
                        : dragging
                          ? "border-l-sky-400 opacity-50 scale-95"
                          : "border-l-[var(--accent)] hover:border-l-sky-300"
                    }`}
                    title="Drag onto a ledger item to manually match"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-md bg-sky-500/15 text-accent px-2 py-0.5 text-xs font-medium">
                        Bank
                      </span>
                      <CategoryBadge description={txn.description} />
                      <span className="flex-1 text-sm text-primary min-w-[10rem]">
                        {txn.description}
                      </span>
                      <span className="font-medium text-primary text-sm">
                        {formatPKR(txn.amount)}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDate(txn.date)}
                      </span>
                      {anomalyMap[r.id] && (
                        <AnomalyFlagBadge reason={anomalyMap[r.id]} />
                      )}
                      <span
                        className="ml-auto text-muted text-xs"
                        aria-hidden
                      >
                        ⠿ drag
                      </span>
                    </div>
                    {hintMap[r.id] && (
                      <p className="mt-2 text-xs text-secondary leading-relaxed">
                        💡 {hintMap[r.id]}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Ledger-only column — drop targets */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-primary">Ledger Only</h3>
            <span className="rounded-full bg-[rgba(139,92,246,0.15)] text-[var(--purple)] px-2.5 py-0.5 text-xs font-medium">
              {ledgerOnly.length}
            </span>
          </div>
          {ledgerOnly.length === 0 ? (
            <p className="text-sm text-muted">None</p>
          ) : (
            <ul className="space-y-2">
              {ledgerOnly.map((r) => {
                const txn = r.ledgerEntry!;
                const isTarget = dropTargetId === r.id;
                const matched = justMatchedIds.has(r.id);
                return (
                  <li
                    key={r.id}
                    onDragOver={(e) => {
                      if (!draggingBankId) return;
                      e.preventDefault();
                      setDropTargetId(r.id);
                    }}
                    onDragLeave={() => setDropTargetId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(r.id);
                    }}
                    className={`card-surface border-l-[3px] p-4 transition-all ${
                      matched
                        ? "border-l-emerald-500 bg-emerald-500/10 opacity-60"
                        : isTarget
                          ? "border-l-emerald-400 bg-emerald-500/15 scale-[1.01] ring-1 ring-emerald-400/50"
                          : draggingBankId
                            ? "border-l-[var(--purple)] border-dashed opacity-90"
                            : "border-l-[var(--purple)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-md bg-[rgba(139,92,246,0.15)] text-[var(--purple)] px-2 py-0.5 text-xs font-medium">
                        Ledger
                      </span>
                      <CategoryBadge description={txn.description} />
                      <span className="flex-1 text-sm text-primary min-w-[10rem]">
                        {txn.description}
                      </span>
                      <span className="font-medium text-primary text-sm">
                        {formatPKR(txn.amount)}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDate(txn.date)}
                      </span>
                      {anomalyMap[r.id] && (
                        <AnomalyFlagBadge reason={anomalyMap[r.id]} />
                      )}
                      {isTarget && (
                        <span className="ml-auto text-emerald-400 text-xs font-medium animate-pulse-subtle">
                          Drop here ✓
                        </span>
                      )}
                    </div>
                    {hintMap[r.id] && (
                      <p className="mt-2 text-xs text-secondary leading-relaxed">
                        💡 {hintMap[r.id]}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
