import type { MatchResult } from "@/lib/types";
import { formatDate, formatPKR } from "@/lib/format";
import { isAIConfirmedUnmatched } from "@/lib/ai-display";
import { EmptyState } from "./EmptyState";

interface UnmatchedListProps {
  results: MatchResult[];
}

function UnmatchedSection({
  title,
  count,
  items,
  source,
  badgeClass,
  borderClass,
}: {
  title: string;
  count: number;
  items: MatchResult[];
  source: "bank" | "ledger";
  badgeClass: string;
  borderClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => {
            const txn =
              source === "bank" ? r.bankTransaction : r.ledgerEntry;
            if (!txn) return null;
            const aiConfirmed = isAIConfirmedUnmatched(r);
            return (
              <li
                key={r.id}
                className={`card-surface border-l-[3px] p-4 ${borderClass}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                  >
                    {source === "bank" ? "Bank" : "Ledger"}
                  </span>
                  <span className="flex-1 text-sm text-primary">
                    {txn.description}
                  </span>
                  <span className="tabular-nums font-medium text-primary">
                    {formatPKR(txn.amount)}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDate(txn.date)}
                  </span>
                </div>
                {aiConfirmed && (
                  <p className="mt-2 text-xs text-accent/80">
                    ✦ AI confirmed: no matching entry found
                  </p>
                )}
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

  if (unmatched.length === 0) {
    return (
      <EmptyState
        icon="🎯"
        title="Perfect reconciliation"
        message="Every transaction has a match."
      />
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <UnmatchedSection
        title="Bank Only"
        count={bankOnly.length}
        items={bankOnly}
        source="bank"
        badgeClass="bg-[rgba(56,189,248,0.15)] text-accent"
        borderClass="border-l-[var(--accent)]"
      />
      <UnmatchedSection
        title="Ledger Only"
        count={ledgerOnly.length}
        items={ledgerOnly}
        source="ledger"
        badgeClass="bg-[rgba(139,92,246,0.15)] text-[var(--purple)]"
        borderClass="border-l-[var(--purple)]"
      />
    </div>
  );
}
