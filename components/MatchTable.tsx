import type { MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface MatchTableProps {
  results: MatchResult[];
}

export function MatchTable({ results }: MatchTableProps) {
  if (results.length === 0) {
    return (
      <p className="text-center text-slate-500 py-8">No auto-matched transactions.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="px-4 py-3">Bank Description</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Ledger Description</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {results.map((r) => (
            <tr key={r.id} className="bg-slate-900/50 hover:bg-slate-800/50">
              <td className="px-4 py-3 text-slate-200">
                {r.bankTransaction?.description}
              </td>
              <td className="px-4 py-3 text-slate-100">
                {r.bankTransaction ? formatPKR(r.bankTransaction.amount) : "—"}
              </td>
              <td className="px-4 py-3 text-slate-200">
                {r.ledgerEntry?.description}
              </td>
              <td className="px-4 py-3 text-slate-400">
                {r.bankTransaction ? formatDate(r.bankTransaction.date) : "—"}
              </td>
              <td className="px-4 py-3">
                <ConfidenceBadge confidence={r.confidence} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    r.status === "posted"
                      ? "bg-violet-500/20 text-violet-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {r.status === "posted" ? "Posted" : "Auto Matched"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
