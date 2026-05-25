"use client";

import type { JournalPost, MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
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
  journalPosts,
  onPostAll,
  onPostSelected,
  isPosting,
}: PostEntriesPanelProps) {
  const postable = getPostableMatches(results);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div>
          <h3 className="font-semibold text-emerald-300">Post matched entries</h3>
          <p className="mt-1 text-sm text-slate-400">
            Record approved and auto-matched pairs to the ledger (journal post).
          </p>
        </div>
        <button
          type="button"
          onClick={onPostAll}
          disabled={isPosting || postable.length === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isPosting
            ? "Posting…"
            : `Post all (${postable.length})`}
        </button>
      </div>

      {postable.length > 0 ? (
        <ul className="space-y-2">
          {postable.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">
                  {r.bankTransaction?.description}
                </p>
                <p className="text-xs text-slate-500">
                  {formatPKR(r.bankTransaction?.amount ?? 0)} · {r.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onPostSelected([r.id])}
                disabled={isPosting}
                className="rounded-lg border border-emerald-600/50 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                Post
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">
          No pending matches to post (approve review items first).
        </p>
      )}

      {journalPosts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            Journal post log ({journalPosts.length})
          </h4>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-slate-900 text-slate-500">
                <tr>
                  <th className="px-3 py-2">Posted</th>
                  <th className="px-3 py-2">Narration</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Refs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {journalPosts.map((j) => (
                  <tr key={j.id} className="bg-slate-900/40">
                    <td className="px-3 py-2 text-slate-400">
                      {formatDate(j.postedAt.slice(0, 10))}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{j.narration}</td>
                    <td className="px-3 py-2 text-slate-200">
                      {formatPKR(j.amount)}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {j.bankReference} / {j.ledgerReference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
