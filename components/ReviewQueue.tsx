"use client";

import type { MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface ReviewQueueProps {
  results: MatchResult[];
  onUpdate: (id: string, status: "approved" | "rejected") => void;
}

export function ReviewQueue({ results, onUpdate }: ReviewQueueProps) {
  if (results.length === 0) {
    return (
      <p className="text-center text-slate-500 py-8">No items need review.</p>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((r) => {
        const bank = r.bankTransaction;
        const ledger = r.ledgerEntry;
        const amountDiff =
          bank && ledger ? Math.abs(bank.amount - ledger.amount) : 0;

        let borderClass = "border-l-slate-700";
        if (r.status === "approved") borderClass = "border-l-emerald-500";
        if (r.status === "rejected") borderClass = "border-l-red-500";

        return (
          <div
            key={r.id}
            className={`rounded-lg border border-slate-800 bg-slate-900 p-5 border-l-4 ${borderClass}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex-1 rounded-lg bg-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Bank</p>
                <p className="font-medium text-slate-100">{bank?.description}</p>
                <p className="text-sm text-slate-400 mt-1">
                  {bank ? formatDate(bank.date) : "—"} ·{" "}
                  {bank ? formatPKR(bank.amount) : "—"}
                </p>
              </div>

              <span className="text-sky-400 text-xl text-center">↔</span>

              <div className="flex-1 rounded-lg bg-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Ledger</p>
                <p className="font-medium text-slate-100">
                  {ledger?.description}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {ledger ? formatDate(ledger.date) : "—"} ·{" "}
                  {ledger ? formatPKR(ledger.amount) : "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ConfidenceBadge confidence={r.confidence} />
              <p className="text-sm text-slate-400">{r.matchReason}</p>
            </div>

            {amountDiff > 0 && (
              <p className="mt-2 text-sm text-amber-400">
                Amount difference: {formatPKR(amountDiff)}
              </p>
            )}

            {r.status === "review" && (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => onUpdate(r.id, "approved")}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(r.id, "rejected")}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                >
                  ✗ Reject
                </button>
              </div>
            )}

            {r.status === "approved" && (
              <p className="mt-3 text-sm text-emerald-400">Approved</p>
            )}
            {r.status === "rejected" && (
              <p className="mt-3 text-sm text-red-400">Rejected</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
