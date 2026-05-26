"use client";

import type { MissingEntryProposal } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { EmptyState } from "./EmptyState";

interface MissingEntriesPanelProps {
  proposals: MissingEntryProposal[];
  onGenerate: () => void;
  onPost: (ids: string[]) => void;
  isGenerating: boolean;
  isPosting: boolean;
}

export function MissingEntriesPanel({
  proposals,
  onPost,
  isPosting,
}: MissingEntriesPanelProps) {
  const draft = proposals.filter((p) => p.status === "draft");

  if (draft.length === 0) {
    return (
      <section className="card-surface p-6">
        <h3 className="text-lg font-semibold text-primary">
          Generated Missing Entries
        </h3>
        <EmptyState
          icon="📝"
          title="No proposals yet"
          message="Click 'Generate Missing Entries' on the Unmatched tab first."
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-primary">
        Generated Missing Entries
      </h3>
      {draft.map((p) => {
        const isBank = p.source === "bank_only";
        const desc = isBank
          ? p.proposedLedgerEntry.description
          : p.proposedBankTransaction.description;
        const amount = isBank
          ? p.proposedLedgerEntry.amount
          : p.proposedBankTransaction.amount;
        const date = isBank
          ? p.proposedLedgerEntry.date
          : p.proposedBankTransaction.date;

        return (
          <article key={p.id} className="card-surface p-5">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                isBank
                  ? "bg-[rgba(56,189,248,0.15)] text-accent"
                  : "bg-[rgba(139,92,246,0.15)] text-[var(--purple)]"
              }`}
            >
              From {isBank ? "Bank" : "Ledger"}
            </span>
            <p className="mt-3 text-sm text-primary">
              → {desc}
            </p>
            <p className="mt-1 text-xs text-secondary tabular-nums">
              {formatPKR(amount)} · {formatDate(date)}
            </p>
            <button
              type="button"
              onClick={() => onPost([p.id])}
              disabled={isPosting}
              className="btn-ghost mt-4 px-4 py-2 text-xs"
            >
              Post proposal
            </button>
          </article>
        );
      })}
    </section>
  );
}
