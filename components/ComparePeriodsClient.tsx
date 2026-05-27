"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SiteHeader } from "@/components/SiteHeader";
import type { PeriodComparisonResult } from "@/lib/period-comparison";

export function ComparePeriodsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [needsMore, setNeedsMore] = useState(false);
  const [comparison, setComparison] = useState<PeriodComparisonResult | null>(
    null
  );

  useEffect(() => {
    fetch("/api/analytics/compare-periods")
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Failed to load comparison");
        }
        return res.json();
      })
      .then(
        (data: {
          sessionCount: number;
          needsMoreSessions: boolean;
          comparison: PeriodComparisonResult | null;
        }) => {
          setSessionCount(data.sessionCount);
          setNeedsMore(data.needsMoreSessions);
          setComparison(data.comparison);
        }
      )
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, []);

  const chartData =
    comparison?.monthly.map((m) => ({
      name: m.label.split(" ")[0],
      fullLabel: m.label,
      matchRate: m.matchRate,
    })) ?? [];

  return (
    <div className="min-h-screen bg-primary">
      <SiteHeader active="compare" role="TEAM" />
      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Compare Periods</h1>
            <p className="mt-1 text-sm text-secondary">
              Match rate trends and recurring unmatched categories across sessions
            </p>
          </div>
          <Link href="/history" className="text-sm text-accent hover:underline">
            View history →
          </Link>
        </div>

        {loading && (
          <p className="text-center text-muted py-16">Loading analytics…</p>
        )}

        {error && (
          <p className="rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {!loading && !error && needsMore && (
          <div className="card-surface p-8 text-center">
            <p className="text-primary font-medium">
              Run at least two reconciliations to compare periods
            </p>
            <p className="mt-2 text-sm text-muted">
              You have {sessionCount} session
              {sessionCount === 1 ? "" : "s"} saved. Upload another month&apos;s
              files to see trends.
            </p>
            <Link href="/upload" className="btn-primary inline-block mt-6 px-6 py-2.5 text-sm">
              New upload
            </Link>
          </div>
        )}

        {!loading && !error && comparison && (
          <div className="space-y-8">
            {comparison.periodNarrative && (
              <div className="card-surface p-5 border-l-[3px] border-l-[var(--success)]">
                <p className="text-sm font-semibold text-primary">Period summary</p>
                <p className="mt-2 text-lg text-secondary">
                  {comparison.periodNarrative}
                  {comparison.trend === "up" && (
                    <span className="ml-2 text-[var(--success)]" aria-hidden>
                      ↑
                    </span>
                  )}
                  {comparison.trend === "down" && (
                    <span className="ml-2 text-[var(--danger)]" aria-hidden>
                      ↓
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Based on {sessionCount} saved sessions in your database
                </p>
              </div>
            )}

            <div className="card-surface p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-primary mb-4">
                Match rate over time
              </h2>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0].payload as {
                          fullLabel?: string;
                        };
                        const rate = Number(payload[0].value ?? 0);
                        return (
                          <div className="rounded-lg border border-default bg-elevated px-3 py-2 text-xs text-primary shadow-lg">
                            <p className="font-medium text-secondary">
                              {point.fullLabel ?? label}
                            </p>
                            <p>Match rate: {rate}%</p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="matchRate"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={{ fill: "#38bdf8", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {comparison.consistentUnmatched.length > 0 && (
              <div className="card-surface p-4 sm:p-6">
                <h2 className="text-sm font-semibold text-primary">
                  Consistently unmatched categories
                </h2>
                <p className="text-xs text-muted mt-1 mb-4">
                  Categories that stayed unmatched across multiple reconciliation
                  runs — worth fixing in your ledger or bank rules
                </p>
                <ul className="space-y-3">
                  {comparison.consistentUnmatched.map((item) => (
                    <li
                      key={item.category}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-input border border-default px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-primary">
                        {item.category}
                      </span>
                      <span className="text-xs text-muted">
                        Unmatched in {item.sessionCount} sessions · e.g. &quot;
                        {item.example}&quot;
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {comparison.consistentUnmatched.length === 0 && (
              <p className="text-sm text-muted text-center py-4">
                No recurring unmatched categories across sessions yet — good sign.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
