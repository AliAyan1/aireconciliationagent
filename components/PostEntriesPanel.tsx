"use client";

import type { JournalPost, MatchResult } from "@/lib/types";
import { AmountWithHoverStat } from "./AmountWithHoverStat";
import { getPostableMatches } from "@/lib/entries";

interface PostEntriesPanelProps {
  results: MatchResult[];
  journalPosts: JournalPost[];
  onPostAll: () => void;
  onPostSelected: (matchIds: string[]) => void;
  isPosting: boolean;
}

export function PostEntriesPanel({
  results,
  onPostAll,
  isPosting,
}: PostEntriesPanelProps) {
  const postable = getPostableMatches(results);

  return (
    <section className="card-surface p-6">
      <h3 className="text-lg font-semibold text-primary">Post Matched Entries</h3>
      <p className="mt-2 text-sm text-secondary">
        Post auto-matched and approved entries to the journal
      </p>
      <p className="mt-3 text-sm text-accent tabular-nums">
        {postable.length} entr{postable.length === 1 ? "y" : "ies"} ready to post
      </p>
      <button
        type="button"
        onClick={onPostAll}
        disabled={isPosting || postable.length === 0}
        className="btn-primary mt-4 w-full py-3 text-sm"
        aria-label="Post all matched entries"
      >
        {isPosting ? "Posting…" : "Post All Entries"}
      </button>
      {postable.length > 0 && (
        <ul className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          {postable.slice(0, 5).map((r) => (
            <li
              key={r.id}
              className="text-xs text-secondary truncate border-t border-default pt-2"
            >
              {r.bankTransaction?.description} ·{" "}
              {r.bankTransaction ? (
                <AmountWithHoverStat
                  amount={r.bankTransaction.amount}
                  source="bank"
                  transactionId={r.bankTransaction.id}
                  type={r.bankTransaction.type}
                />
              ) : (
                "—"
              )}
            </li>
          ))}
          {postable.length > 5 && (
            <li className="text-xs text-muted">
              +{postable.length - 5} more…
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
