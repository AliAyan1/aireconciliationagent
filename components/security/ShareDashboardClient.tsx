"use client";

import { MatchTable } from "@/components/MatchTable";
import type { ShareSnapshot } from "@/lib/share-snapshot";
import { FileIntegrityCard } from "./FileIntegrityCard";

interface ShareDashboardClientProps {
  snapshot: ShareSnapshot;
  expiresAt: string;
}

export function ShareDashboardClient({
  snapshot,
  expiresAt,
}: ShareDashboardClientProps) {
  const { results, summary, auditMeta } = snapshot;

  return (
    <div className="min-h-screen bg-primary text-primary">
      <header className="border-b border-default bg-primary/95 px-6 py-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          Read-only shared view
        </p>
        <h1 className="text-xl font-bold mt-1">Reconciliation results</h1>
        <p className="text-sm text-secondary mt-1">
          Expires {new Date(expiresAt).toLocaleString("en-PK")} · Approve/reject
          disabled
        </p>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{summary.matchRate}%</p>
            <p className="text-xs text-muted mt-1">Match rate</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{summary.autoMatched}</p>
            <p className="text-xs text-muted mt-1">Auto-matched</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{summary.unmatched}</p>
            <p className="text-xs text-muted mt-1">Unmatched</p>
          </div>
        </div>
        {auditMeta && (
          <FileIntegrityCard
            bankFileName={auditMeta.bankFileName}
            bankFileHash={auditMeta.bankFileHash}
            ledgerFileName={auditMeta.ledgerFileName}
            ledgerFileHash={auditMeta.ledgerFileHash}
          />
        )}
        <MatchTable results={results} hideSearch />
      </main>
    </div>
  );
}
