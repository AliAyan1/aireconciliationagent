"use client";

import type { TestRunResult } from "@/lib/test-runner";

interface TestReportProps {
  result: TestRunResult;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function SegmentBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-input">
        {segments.map((seg) =>
          seg.value > 0 ? (
            <div
              key={seg.label}
              className="h-full transition-all"
              style={{
                width: `${(seg.value / total) * 100}%`,
                backgroundColor: seg.color,
              }}
              title={`${seg.label}: ${seg.value}`}
            />
          ) : null
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            {seg.label} ({seg.value})
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TestReport({ result }: TestReportProps) {
  const errors = result.issues.filter((i) => i.type === "error");
  const warnings = result.issues.filter((i) => i.type === "warning");
  const isClean = result.issues.length === 0;

  const phaseTotal =
    result.exactMatches +
    result.nearMatches +
    result.fuzzyMatches +
    result.aiMatches;

  const confTotal =
    result.highConfidence + result.mediumConfidence + result.lowConfidence;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">{result.datasetName}</h2>
          <p className="mt-1 text-sm text-secondary">
            {result.bankRows} bank rows · {result.ledgerRows} ledger rows ·{" "}
            {formatMs(result.processingTimeMs)}
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isClean
              ? "bg-[rgba(16,185,129,0.15)] text-[var(--success)]"
              : errors.length > 0
                ? "bg-[rgba(239,68,68,0.12)] text-[var(--danger)]"
                : "bg-[rgba(245,158,11,0.12)] text-[var(--warning)]"
          }`}
        >
          {isClean
            ? "This dataset is clean ✅"
            : errors.length > 0
              ? `❌ ${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
              : `⚠ ${warnings.length} issue${warnings.length === 1 ? "" : "s"} found`}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Total matches", result.totalMatches],
            ["Auto matched", result.autoMatched],
            ["Needs review", result.needsReview],
            ["Unmatched", result.unmatched],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card-surface p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-primary">Match rate</p>
          <p className="text-sm font-bold tabular-nums text-accent">
            {result.matchRate}%
          </p>
        </div>
        <div className="h-3 w-full rounded-full bg-input overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.min(100, result.matchRate)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-5">
          <p className="text-sm font-medium text-primary mb-3">Phase distribution</p>
          {phaseTotal === 0 ? (
            <p className="text-xs text-muted">No paired matches</p>
          ) : (
            <SegmentBar
              segments={[
                {
                  label: "Exact",
                  value: result.exactMatches,
                  color: "#10b981",
                },
                {
                  label: "Near",
                  value: result.nearMatches,
                  color: "#38bdf8",
                },
                {
                  label: "Fuzzy",
                  value: result.fuzzyMatches,
                  color: "#f59e0b",
                },
                {
                  label: "AI",
                  value: result.aiMatches,
                  color: "#8b5cf6",
                },
              ]}
            />
          )}
        </div>

        <div className="card-surface p-5">
          <p className="text-sm font-medium text-primary mb-3">
            Confidence distribution
          </p>
          {confTotal === 0 ? (
            <p className="text-xs text-muted">No confidence scores on pairs</p>
          ) : (
            <SegmentBar
              segments={[
                {
                  label: "> 90%",
                  value: result.highConfidence,
                  color: "#10b981",
                },
                {
                  label: "70–90%",
                  value: result.mediumConfidence,
                  color: "#f59e0b",
                },
                {
                  label: "< 70%",
                  value: result.lowConfidence,
                  color: "#ef4444",
                },
              ]}
            />
          )}
        </div>
      </div>

      {result.issues.length > 0 && (
        <div className="card-surface p-5">
          <p className="text-sm font-medium text-primary mb-3">Issues</p>
          <ul className="space-y-2">
            {result.issues.map((issue, i) => (
              <li
                key={`${issue.type}-${i}`}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                  issue.type === "error"
                    ? "bg-[rgba(239,68,68,0.08)] text-[var(--danger)]"
                    : "bg-[rgba(245,158,11,0.08)] text-[var(--warning)]"
                }`}
              >
                <span className="shrink-0" aria-hidden>
                  {issue.type === "error" ? "❌" : "⚠️"}
                </span>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
