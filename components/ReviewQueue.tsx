"use client";

import { useMemo, useState } from "react";
import type { MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { getMatchAIReasoning, isMatchAIScored } from "@/lib/ai-display";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EmptyState } from "./EmptyState";
import { MatchTypeBadge } from "./MatchTypeBadge";

interface ReviewQueueProps {
  results: MatchResult[];
  onUpdate: (id: string, status: "approved" | "rejected") => void;
  focusedId?: string | null;
  onFocusChange?: (id: string | null) => void;
}

export function ReviewQueue({
  results,
  onUpdate,
  focusedId,
  onFocusChange,
}: ReviewQueueProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{
    action: "approve" | "reject";
    count: number;
  } | null>(null);

  const pending = useMemo(
    () => results.filter((r) => r.status === "review"),
    [results]
  );

  const pendingIds = pending.map((r) => r.id);
  const allSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  }

  function runBulk(action: "approve" | "reject") {
    const status = action === "approve" ? "approved" : "rejected";
    const ids = [...selected].filter((id) =>
      pending.some((r) => r.id === id)
    );
    ids.forEach((id) => onUpdate(id, status));
    setSelected(new Set());
    setConfirm(null);
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon="👀"
        title="Nothing to review"
        message="All matches are high confidence — great job!"
      />
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="card-surface p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-default"
              aria-label="Select all pending review items"
            />
            Select all pending
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted">
                {selected.size} of {pending.length} selected
              </span>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={() =>
                    setConfirm({ action: "approve", count: selected.size })
                  }
                  className="rounded-lg border border-[var(--success)] px-3 py-1.5 text-sm font-medium text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-all"
                >
                  Approve All Selected
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirm({ action: "reject", count: selected.size })
                  }
                  className="rounded-lg border border-[var(--danger)] px-3 py-1.5 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all"
                >
                  Reject All Selected
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {results.map((r) => {
        const bank = r.bankTransaction;
        const ledger = r.ledgerEntry;
        const amountDiff =
          bank && ledger ? Math.abs(bank.amount - ledger.amount) : 0;
        const aiScored = isMatchAIScored(r);
        const aiReasoning = getMatchAIReasoning(r);
        const isFocused = focusedId === r.id;
        const isPending = r.status === "review";

        let border = "border-l-[var(--warning)]";
        if (r.status === "approved") border = "border-l-[var(--success)]";
        if (r.status === "rejected") border = "border-l-[var(--danger)]";
        if (aiScored && r.status === "review") border = "border-l-[var(--accent)]";

        return (
          <article
            key={r.id}
            tabIndex={isPending ? 0 : -1}
            onFocus={() => onFocusChange?.(r.id)}
            onClick={() => onFocusChange?.(r.id)}
            className={`card-surface border-l-[3px] p-4 sm:p-5 transition-all duration-200 ${border} ${
              isFocused ? "ring-2 ring-[var(--border-active)]" : ""
            } ${r.status !== "review" ? "-translate-y-0.5" : ""}`}
          >
            <div className="flex items-start gap-3 mb-3">
              {isPending && (
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggleOne(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 rounded border-default"
                  aria-label={`Select ${bank?.description}`}
                />
              )}
              <div className="flex-1 min-w-0">
                {aiScored && r.status === "review" && (
                  <p className="mb-2 text-xs font-semibold text-accent">
                    ✦ AI Suggested
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <ConfidenceBadge
                    confidence={r.confidence}
                    isAIScored={aiScored}
                    aiReasoning={aiReasoning}
                  />
                  <MatchTypeBadge matchType={r.matchType} />
                </div>
              </div>
            </div>

            {aiScored && aiReasoning && (
              <p className="mb-4 text-sm text-accent/90">
                AI thinks: {aiReasoning}
              </p>
            )}

            <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] gap-4 md:items-center">
              <div className="rounded-lg bg-input p-4 border border-default">
                <p className="text-[10px] uppercase tracking-wide text-muted mb-1">
                  🏦 Bank Statement
                </p>
                <p className="text-sm font-semibold text-primary">{bank?.description}</p>
                <p className="mt-1 text-xs text-secondary tabular-nums">
                  {bank ? formatDate(bank.date) : "—"} ·{" "}
                  {bank ? formatPKR(bank.amount) : "—"}
                </p>
              </div>
              <span className="text-accent text-xl text-center hidden md:block" aria-hidden>
                ⟷
              </span>
              <div className="rounded-lg bg-input p-4 border border-default">
                <p className="text-[10px] uppercase tracking-wide text-muted mb-1">
                  📒 Ledger Entry
                </p>
                <p className="text-sm font-semibold text-primary">
                  {ledger?.description}
                </p>
                <p className="mt-1 text-xs text-secondary tabular-nums">
                  {ledger ? formatDate(ledger.date) : "—"} ·{" "}
                  {ledger ? formatPKR(ledger.amount) : "—"}
                </p>
              </div>
            </div>

            {amountDiff > 0 && (
              <p className="mt-3 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] px-3 py-2 text-sm text-[var(--warning)]">
                ⚠ Amount difference: {formatPKR(amountDiff)}
              </p>
            )}

            {r.status === "review" && (
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onUpdate(r.id, "approved")}
                  className="rounded-lg border border-[var(--success)] px-4 py-2 text-sm font-medium text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-all"
                  aria-label="Approve match"
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(r.id, "rejected")}
                  className="rounded-lg border border-[var(--danger)] px-4 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all"
                  aria-label="Reject match"
                >
                  ✗ Reject
                </button>
              </div>
            )}

            {r.status === "approved" && (
              <p className="mt-3 text-sm font-medium text-[var(--success)]">
                Approved ✓
              </p>
            )}
            {r.status === "rejected" && (
              <p className="mt-3 text-sm font-medium text-[var(--danger)]">
                Rejected ✗
              </p>
            )}
          </article>
        );
      })}

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,10,18,0.6)] p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="card-surface max-w-sm w-full p-6 animate-fade-up">
            <p className="text-primary font-medium">
              {confirm.action === "approve" ? "Approve" : "Reject"}{" "}
              {confirm.count} match{confirm.count === 1 ? "" : "es"}?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="btn-ghost px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => runBulk(confirm.action)}
                className={
                  confirm.action === "approve" ? "btn-primary px-4 py-2 text-sm" : "rounded-lg bg-[var(--danger)] px-4 py-2 text-sm text-white"
                }
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
