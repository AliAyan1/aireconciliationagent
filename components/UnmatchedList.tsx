import type { MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";

interface UnmatchedListProps {
  results: MatchResult[];
}

function UnmatchedSection({
  title,
  items,
  source,
}: {
  title: string;
  items: MatchResult[];
  source: "bank" | "ledger";
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-200 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => {
            const txn =
              source === "bank" ? r.bankTransaction : r.ledgerEntry;
            if (!txn) return null;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
              >
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    source === "bank"
                      ? "bg-sky-500/20 text-sky-400"
                      : "bg-indigo-500/20 text-indigo-400"
                  }`}
                >
                  {source === "bank" ? "Bank" : "Ledger"}
                </span>
                <span className="flex-1 text-slate-200">{txn.description}</span>
                <span className="text-slate-100">{formatPKR(txn.amount)}</span>
                <span className="text-sm text-slate-500">
                  {formatDate(txn.date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function UnmatchedList({ results }: UnmatchedListProps) {
  const unmatched = results.filter((r) => r.status === "unmatched");
  const bankOnly = unmatched.filter((r) => r.bankTransaction && !r.ledgerEntry);
  const ledgerOnly = unmatched.filter((r) => r.ledgerEntry && !r.bankTransaction);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <UnmatchedSection title="Bank Only" items={bankOnly} source="bank" />
      <UnmatchedSection title="Ledger Only" items={ledgerOnly} source="ledger" />
    </div>
  );
}
