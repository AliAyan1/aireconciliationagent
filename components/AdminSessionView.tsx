"use client";

import Link from "next/link";
import { LiveIndicator } from "./LiveIndicator";
import { SiteHeader } from "./SiteHeader";
import { usePollingFetch } from "@/hooks/usePollingFetch";
import { APP_NAME } from "@/lib/branding";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { formatPKR } from "@/lib/format";
import { isMatchAIScored } from "@/lib/ai-display";
import type { MatchResult } from "@/lib/types";

interface SessionPayload {
  session: {
    id: string;
    name: string | null;
    bankFileName: string;
    ledgerFileName: string;
    matchRate: number;
    aiScoringUsed: boolean;
    aiPairsScored: number;
  };
  summary: {
    totalBankTxns: number;
    autoMatched: number;
    needsReview: number;
    unmatched: number;
    matchRate: number;
    difference: number;
  };
  results: MatchResult[];
}

export function AdminSessionView({ sessionId }: { sessionId: string }) {
  const { data, error, loading, lastUpdated } = usePollingFetch<SessionPayload>(
    `/api/sessions/${sessionId}`
  );

  const auto = data?.results.filter(
    (r) => r.status === "auto_matched" || r.status === "posted"
  );
  const review = data?.results.filter((r) => r.status === "review");
  const unmatched = data?.results.filter((r) => r.status === "unmatched");

  return (
    <div className="min-h-screen bg-primary">
      <SiteHeader active="admin" role="ADMIN" />
      <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-8">
        <Link href="/admin" className="text-sm text-accent hover:underline">
          ← Back to admin dashboard
        </Link>

        {loading && !data && (
          <p className="mt-6 text-muted">Loading session…</p>
        )}
        {error && (
          <p className="mt-6 text-[var(--danger)]">{error}</p>
        )}

        {data && (
          <>
            <header className="mt-6 mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
              <h1 className="text-2xl font-bold text-primary">
                {data.session.name ?? `${APP_NAME} session`}
              </h1>
              <p className="text-sm text-secondary mt-1">
                {data.session.bankFileName} · {data.session.ledgerFileName}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="text-[var(--success)]">
                  {data.summary.matchRate}% matched
                </span>
                <span>Auto: {data.summary.autoMatched}</span>
                <span className="text-[var(--warning)]">
                  Review: {data.summary.needsReview}
                </span>
                <span className="text-[var(--danger)]">
                  Unmatched: {data.summary.unmatched}
                </span>
                {data.session.aiScoringUsed && (
                  <span className="text-accent">
                    ✦ AI scored {data.session.aiPairsScored} pairs
                  </span>
                )}
              </div>
              </div>
              <LiveIndicator lastUpdated={lastUpdated} />
            </header>

            <Section title={`Auto matched (${auto?.length ?? 0})`} items={auto ?? []} />
            <Section title={`Needs review (${review?.length ?? 0})`} items={review ?? []} />
            <Section title={`Unmatched (${unmatched?.length ?? 0})`} items={unmatched ?? []} />
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, items }: { title: string; items: MatchResult[] }) {
  if (items.length === 0) {
    return (
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-primary mb-2">{title}</h2>
        <p className="text-sm text-muted">None</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-primary mb-3">{title}</h2>
      <ul className="space-y-2">
        {items.map((r) => {
          const ai = isMatchAIScored(r);
          const txn = r.bankTransaction ?? r.ledgerEntry;
          return (
            <li key={r.id} className="card-surface p-3 flex flex-wrap gap-3 items-center">
              <ConfidenceBadge
                confidence={r.confidence}
                isAIScored={ai}
                aiReasoning={r.aiMetadata?.aiReasoning ?? undefined}
              />
              <span className="text-sm text-primary flex-1 min-w-[200px]">
                {r.bankTransaction?.description ?? "—"} →{" "}
                {r.ledgerEntry?.description ?? txn?.description ?? "—"}
              </span>
              <span className="text-sm tabular-nums text-secondary">
                {txn ? formatPKR(txn.amount) : "—"}
              </span>
              <span className="text-xs text-muted">{r.status}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
