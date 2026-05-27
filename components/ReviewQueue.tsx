"use client";

import { useCallback, useMemo, useState } from "react";
import { CategoryBadge } from "./ai/CategoryBadge";
import { ConfidenceBreakdown } from "./ai/ConfidenceBreakdown";
import { FraudAlertBadge } from "./ai/FraudAlertBadge";
import { ReviewConversation } from "./ai/ReviewConversation";
import { RiskBadge } from "./ai/RiskBadge";
import { VoiceReviewControls } from "./ai/VoiceReviewControls";
import { ReviewMobileSheet } from "./dashboard/ReviewMobileSheet";
import type { MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { getMatchAIReasoning, isMatchAIScored } from "@/lib/ai-display";
import { AnomalyFlagBadge } from "./AnomalyFlagBadge";
import { EmptyState } from "./EmptyState";
import { ExplainMatchButton } from "./ExplainMatchButton";
import { MatchTypeBadge } from "./MatchTypeBadge";
import { isBankCharge } from "@/lib/transaction-categories";
import { AmountWithHoverStat } from "./AmountWithHoverStat";

interface ReviewQueueProps {
  results: MatchResult[];
  onUpdate: (id: string, status: "approved" | "rejected") => void;
  /** If provided, called for single-item decisions (wraps with undo). Falls back to onUpdate. */
  onCommit?: (match: MatchResult, status: "approved" | "rejected") => void;
  focusedId?: string | null;
  onFocusChange?: (id: string | null) => void;
  anomalyMap?: Record<string, string>;
  fraudMap?: Record<string, string>;
}

export function ReviewQueue({
  results,
  onUpdate,
  onCommit,
  focusedId,
  onFocusChange,
  anomalyMap = {},
  fraudMap = {},
}: ReviewQueueProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{
    action: "approve" | "reject";
    count: number;
  } | null>(null);
  const [mobileSheetId, setMobileSheetId] = useState<string | null>(null);

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

  const recordDecision = useCallback(
    (match: MatchResult, action: "approved" | "rejected") => {
      if (onCommit) {
        onCommit(match, action);
      } else {
        onUpdate(match.id, action);
      }
    },
    [onUpdate, onCommit]
  );

  function runBulk(action: "approve" | "reject") {
    const status = action === "approve" ? "approved" : "rejected";
    const ids = [...selected].filter((id) =>
      pending.some((r) => r.id === id)
    );
    ids.forEach((id) => {
      const match = pending.find((r) => r.id === id);
      if (match) recordDecision(match, status);
    });
    setSelected(new Set());
    setConfirm(null);
  }

  const focusedPending = pending.find((r) => r.id === focusedId);

  function goNextReview() {
    const idx = pending.findIndex((r) => r.id === focusedId);
    const next = pending[idx + 1] ?? pending[0];
    if (next) onFocusChange?.(next.id);
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
      {focusedPending && (
        <VoiceReviewControls
          disabled={focusedPending.status !== "review"}
          onApprove={() => recordDecision(focusedPending, "approved")}
          onReject={() => recordDecision(focusedPending, "rejected")}
          onNext={goNextReview}
          onSkip={goNextReview}
        />
      )}
      {pending.length > 0 && (
        <div className="no-print glass-card p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
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
            onClick={() => {
              onFocusChange?.(r.id);
              if (isPending && typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
                setMobileSheetId(r.id);
              }
            }}
            className={`glass-card border-l-[3px] p-4 sm:p-5 transition-all duration-200 ${border} ${
              isFocused ? "ring-2 ring-[var(--border-active)]" : ""
            } ${r.status !== "review" ? "-translate-y-0.5" : ""}`}
          >
            <div className="flex items-start gap-3 mb-3">
              {isPending && (
                <input
                  className="no-print mt-1 rounded border-default"
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggleOne(r.id)}
                  onClick={(e) => e.stopPropagation()}
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
                  <ConfidenceBreakdown match={r} showBar={false} />
                  <RiskBadge match={r} />
                  <MatchTypeBadge matchType={r.matchType} />
                  {bank?.description && (
                    <CategoryBadge description={bank.description} />
                  )}
                  {anomalyMap[r.id] && (
                    <AnomalyFlagBadge reason={anomalyMap[r.id]} />
                  )}
                  {fraudMap[r.id] && (
                    <FraudAlertBadge message={fraudMap[r.id]} />
                  )}
                </div>
              </div>
              {bank && ledger && (
                <ExplainMatchButton
                  match={r}
                  className="no-print shrink-0"
                />
              )}
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
                <p className="text-sm font-semibold text-primary">
                  {bank && isBankCharge(bank.description) && (
                    <span className="mr-1" title="Bank charge / fee">
                      🏦
                    </span>
                  )}
                  {bank?.description}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {bank ? formatDate(bank.date) : "—"}
                  {bank && (
                    <>
                      {" · "}
                      <AmountWithHoverStat
                        amount={bank.amount}
                        source="bank"
                        transactionId={bank.id}
                        type={bank.type}
                      />
                    </>
                  )}
                  {!bank && " · —"}
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
                <p className="mt-1 text-xs text-secondary">
                  {ledger ? formatDate(ledger.date) : "—"}
                  {ledger && (
                    <>
                      {" · "}
                      <AmountWithHoverStat
                        amount={ledger.amount}
                        source="ledger"
                        transactionId={ledger.id}
                        type={ledger.type}
                      />
                    </>
                  )}
                  {!ledger && " · —"}
                </p>
              </div>
            </div>

            {amountDiff > 0 && (
              <p className="mt-3 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] px-3 py-2 text-sm text-[var(--warning)]">
                ⚠ Amount difference: {formatPKR(amountDiff)}
              </p>
            )}

            {bank && ledger && r.status === "review" && (
              <ReviewConversation match={r} />
            )}

            {r.status === "review" && (
              <div className="no-print mt-4 hidden md:flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => recordDecision(r, "approved")}
                  className="rounded-lg border border-[var(--success)] px-4 py-2 text-sm font-medium text-[var(--success)] hover:bg-[var(--success)] hover:text-white transition-all"
                  aria-label="Approve match"
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  onClick={() => recordDecision(r, "rejected")}
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

      <ReviewMobileSheet
        open={!!mobileSheetId}
        bankLabel={
          results.find((x) => x.id === mobileSheetId)?.bankTransaction?.description
        }
        onApprove={() => {
          const m = results.find((x) => x.id === mobileSheetId);
          if (m) recordDecision(m, "approved");
          setMobileSheetId(null);
        }}
        onReject={() => {
          const m = results.find((x) => x.id === mobileSheetId);
          if (m) recordDecision(m, "rejected");
          setMobileSheetId(null);
        }}
        onClose={() => setMobileSheetId(null)}
      />

      {confirm && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,10,18,0.6)] p-4 backdrop-blur-sm"
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
