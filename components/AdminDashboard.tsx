"use client";

import Link from "next/link";
import { LiveIndicator } from "./LiveIndicator";
import { SiteHeader } from "./SiteHeader";
import { usePollingFetch } from "@/hooks/usePollingFetch";
import { APP_NAME } from "@/lib/branding";
import { formatPKR } from "@/lib/format";
type Overview = {
  totals: {
    sessions: number;
    aiSessions: number;
    avgMatchRate: number;
    autoMatched: number;
    needsReview: number;
    unmatched: number;
    posted: number;
    aiScoredMatches: number;
  };
  matchTypeBreakdown: Record<string, number>;
  recentSessions: {
    id: string;
    createdAt: string;
    name: string | null;
    status: string;
    bankFileName: string;
    ledgerFileName: string;
    matchRate: number;
    totalAutoMatched: number;
    totalNeedsReview: number;
    totalUnmatched: number;
    totalPosted: number;
    aiScoringUsed: boolean;
    aiPairsScored: number;
    amountDifference: number;
  }[];
  aiRecommendations: {
    sessionId: string;
    sessionName: string;
    confidence: number;
    reasoning: string;
    bankDesc: string;
    ledgerDesc: string;
  }[];
};

export function AdminDashboard() {
  const { data, error, loading, lastUpdated } = usePollingFetch<Overview>(
    "/api/admin/overview"
  );
  const breakdown = data?.matchTypeBreakdown;
  const breakdownTotal = breakdown
    ? Object.values(breakdown).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="min-h-screen bg-primary">
      <SiteHeader active="admin" role="ADMIN" />
      <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">
              Admin · Oversight
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">
              {APP_NAME} intelligence
            </h1>
            <p className="mt-2 text-secondary text-sm max-w-2xl">
              Live view of team reconciliations — stats refresh automatically as
              uploads, matches, reviews, and posts happen.
            </p>
          </div>
          {!loading && !error && <LiveIndicator lastUpdated={lastUpdated} />}
        </div>
        {loading && (
          <p className="text-center text-muted py-16">Loading analytics…</p>
        )}
        {error && (
          <p className="rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                label="Sessions"
                value={data.totals.sessions}
                sub="Reconciliation runs"
                accent="border-l-[var(--accent)]"
              />
              <StatCard
                label="Avg match rate"
                value={`${data.totals.avgMatchRate}%`}
                sub="Across recent sessions"
                accent="border-l-[var(--success)]"
              />
              <StatCard
                label="Auto matched"
                value={data.totals.autoMatched}
                sub="Rule + AI approved"
                accent="border-l-[var(--success)]"
              />
              <StatCard
                label="AI sessions"
                value={data.totals.aiSessions}
                sub={`${data.totals.aiScoredMatches} AI-scored pairs`}
                accent="border-l-[var(--accent)]"
              />
              <StatCard
                label="Needs review"
                value={data.totals.needsReview}
                sub="Pending team action"
                accent="border-l-[var(--warning)]"
              />
              <StatCard
                label="Unmatched"
                value={data.totals.unmatched}
                sub="Open exceptions"
                accent="border-l-[var(--danger)]"
              />
              <StatCard
                label="Posted"
                value={data.totals.posted}
                sub="Journal entries"
                accent="border-l-[var(--purple)]"
              />
            </div>

            {breakdown && breakdownTotal > 0 && (
              <section className="mt-8 card-surface p-5">
                <h2 className="text-lg font-semibold text-primary mb-4">
                  Match type breakdown
                </h2>
                <div className="space-y-3">
                  {(
                    [
                      ["exact", "Exact", "var(--success)"],
                      ["near", "Near date", "var(--info)"],
                      ["fuzzy", "Fuzzy amount", "var(--warning)"],
                      ["ai_scored", "AI scored", "var(--accent)"],
                      ["unmatched", "Unmatched", "var(--danger)"],
                    ] as const
                  ).map(([key, label, color]) => {
                    const count =
                      breakdown[key as keyof typeof breakdown] ?? 0;
                    const pct = Math.round((count / breakdownTotal) * 100);
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-secondary">{label}</span>
                          <span className="text-primary tabular-nums">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-input overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: `var(${color})`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-lg font-semibold text-primary mb-4">
                AI recommendations
              </h2>
              {data.aiRecommendations.length === 0 ? (
                <p className="text-sm text-muted card-surface p-5">
                  No AI-scored matches with reasoning yet. Run reconciliations
                  with OpenAI configured.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.aiRecommendations.map((r, i) => (
                    <li key={`${r.sessionId}-${i}`} className="card-surface p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs rounded-full bg-[rgba(56,189,248,0.12)] text-accent px-2 py-0.5">
                          {r.confidence}% confidence
                        </span>
                        <Link
                          href={`/admin/sessions/${r.sessionId}`}
                          className="text-xs text-secondary hover:text-accent"
                        >
                          {r.sessionName}
                        </Link>
                      </div>
                      <p className="text-sm text-accent mb-2">
                        AI thinks: {r.reasoning}
                      </p>
                      <p className="text-xs text-secondary">
                        🏦 {r.bankDesc} ⟷ 📒 {r.ledgerDesc}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Recent {APP_NAME} reports
              </h2>
              <div className="overflow-x-auto rounded-xl border border-default">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-elevated text-secondary text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Files</th>
                      <th className="px-4 py-3">Match %</th>
                      <th className="px-4 py-3">Auto</th>
                      <th className="px-4 py-3">Review</th>
                      <th className="px-4 py-3">Unmatched</th>
                      <th className="px-4 py-3">AI</th>
                      <th className="px-4 py-3">Diff</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSessions.map((s) => (
                      <tr
                        key={s.id}
                        className="border-t border-default hover:bg-card-hover"
                      >
                        <td className="px-4 py-3 text-secondary whitespace-nowrap">
                          {new Date(s.createdAt).toLocaleDateString("en-PK")}
                        </td>
                        <td className="px-4 py-3 text-primary max-w-[180px] truncate">
                          {s.bankFileName}
                        </td>
                        <td className="px-4 py-3 text-[var(--success)] font-medium tabular-nums">
                          {s.matchRate.toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 tabular-nums">{s.totalAutoMatched}</td>
                        <td className="px-4 py-3 tabular-nums text-[var(--warning)]">
                          {s.totalNeedsReview}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-[var(--danger)]">
                          {s.totalUnmatched}
                        </td>
                        <td className="px-4 py-3">
                          {s.aiScoringUsed ? (
                            <span className="text-accent text-xs">✦ {s.aiPairsScored}</span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-secondary">
                          {formatPKR(s.amountDifference)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/sessions/${s.id}`}
                            className="text-accent text-xs hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  return (
    <div className={`card-surface border-l-[3px] p-4 ${accent}`}>
      <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-secondary">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] text-muted">{sub}</p>
    </div>
  );
}
