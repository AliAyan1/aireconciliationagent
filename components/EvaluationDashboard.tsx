"use client";

import { useState } from "react";
import type { EvaluationResult } from "@/lib/evaluator";

interface EvaluationDashboardProps {
  evaluation: EvaluationResult;
  onRerun?: () => void;
  isRerunning?: boolean;
}

function metricColor(value: number): string {
  if (value > 90) return "text-[var(--success)]";
  if (value > 80) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

function phaseDot(phase: string): string {
  switch (phase) {
    case "exact":
      return "🟢";
    case "near":
      return "🔵";
    case "fuzzy":
      return "🟡";
    case "ai_scored":
      return "🟣";
    default:
      return "⚪";
  }
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "exact":
      return "Exact";
    case "near":
      return "Near";
    case "fuzzy":
      return "Fuzzy";
    case "ai_scored":
      return "AI Scored";
    default:
      return phase;
  }
}

function accuracyClass(value: number): string {
  if (value > 90) return "text-[var(--success)]";
  if (value > 70) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

export function EvaluationDashboard({
  evaluation,
  onRerun,
  isRerunning,
}: EvaluationDashboardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const e = evaluation;
  const phaseTotals = e.phaseBreakdown.reduce(
    (acc, row) => ({
      totalMatched: acc.totalMatched + row.totalMatched,
      correctMatches: acc.correctMatches + row.correctMatches,
      incorrectMatches: acc.incorrectMatches + row.incorrectMatches,
    }),
    { totalMatched: 0, correctMatches: 0, incorrectMatches: 0 }
  );
  const overallPhaseAccuracy =
    phaseTotals.totalMatched > 0
      ? Math.round(
          (phaseTotals.correctMatches / phaseTotals.totalMatched) * 1000
        ) / 10
      : 0;

  const highlightTimeSaved = e.baseline.timeSavedPercent >= 90;

  return (
    <div
      className="evaluation-dashboard space-y-10"
      id="evaluation-print-root"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <p className="text-sm text-muted">
          Measured against {e.totalGroundTruth} ground-truth pairs ·{" "}
          {e.totalResults} engine results
        </p>
        {onRerun && (
          <button
            type="button"
            onClick={onRerun}
            disabled={isRerunning}
            className="btn-ghost px-4 py-2 text-sm"
          >
            {isRerunning ? "Re-running…" : "Re-run Evaluation"}
          </button>
        )}
      </div>

      <section>
        <h2 className="evaluation-section-title">01 Metrics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: "Precision",
                value: e.precision,
                subtitle: `Of matches found, ${e.precision}% were correct`,
                icon: "🎯",
              },
              {
                label: "Recall",
                value: e.recall,
                subtitle: `Of real matches, we found ${e.recall}%`,
                icon: "🔍",
              },
              {
                label: "F1 Score",
                value: e.f1Score,
                subtitle: "Harmonic mean of precision & recall",
                icon: "⚖️",
              },
              {
                label: "Accuracy",
                value: e.accuracy,
                subtitle: "Overall correct decisions",
                icon: "✓",
              },
            ] as const
          ).map((card) => (
            <div key={card.label} className="card-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>
                  {card.icon}
                </span>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {card.label}
                </p>
              </div>
              <p
                className={`mt-3 text-3xl font-bold tabular-nums ${metricColor(card.value)}`}
              >
                {card.value}%
              </p>
              <p className="mt-2 text-xs text-secondary leading-relaxed">
                {card.subtitle}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="evaluation-section-divider">
        <h2 className="evaluation-section-title">02 Confusion Matrix</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm border-collapse">
            <thead>
              <tr className="text-muted">
                <th className="p-2 text-left font-medium" />
                <th className="p-2 text-center font-medium">
                  Predicted: Match
                </th>
                <th className="p-2 text-center font-medium">
                  Predicted: No Match
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 font-medium text-secondary">
                  Actual: Match
                </td>
                <td className="p-4 text-center rounded-lg bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.25)]">
                  <p className="text-3xl font-bold text-[var(--success)]">
                    {e.truePositives}
                  </p>
                  <p className="mt-1 text-xs text-secondary">Correctly matched</p>
                </td>
                <td className="p-4 text-center rounded-lg bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)]">
                  <p className="text-3xl font-bold text-[var(--warning)]">
                    {e.falseNegatives}
                  </p>
                  <p className="mt-1 text-xs text-secondary">Missed matches</p>
                </td>
              </tr>
              <tr>
                <td className="p-2 font-medium text-secondary">
                  Actual: No Match
                </td>
                <td className="p-4 text-center rounded-lg bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)]">
                  <p className="text-3xl font-bold text-[var(--danger)]">
                    {e.falsePositives}
                  </p>
                  <p className="mt-1 text-xs text-secondary">False matches</p>
                </td>
                <td className="p-4 text-center rounded-lg bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.25)]">
                  <p className="text-3xl font-bold text-[var(--success)]">
                    {e.trueNegatives}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Correctly unmatched
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="evaluation-section-divider">
        <h2 className="evaluation-section-title">03 Baseline Comparison</h2>
        <div className="mt-4 overflow-x-auto card-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-default text-muted">
                <th className="px-4 py-3 text-left font-medium">Metric</th>
                <th className="px-4 py-3 text-left font-medium">
                  Manual Process
                </th>
                <th className="px-4 py-3 text-left font-medium">Hisab.ai</th>
                <th className="px-4 py-3 text-left font-medium">Improvement</th>
              </tr>
            </thead>
            <tbody className="text-secondary">
              <tr className="border-b border-default">
                <td className="px-4 py-3 text-primary">Time</td>
                <td className="px-4 py-3">{e.baseline.manualTime}</td>
                <td className="px-4 py-3 text-primary font-medium">
                  {e.baseline.toolTime}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[rgba(16,185,129,0.15)] text-[var(--success)] ${
                      highlightTimeSaved ? "evaluation-glow" : ""
                    }`}
                  >
                    {e.baseline.timeSavedPercent}% faster ⚡
                  </span>
                </td>
              </tr>
              <tr className="border-b border-default">
                <td className="px-4 py-3 text-primary">Accuracy</td>
                <td className="px-4 py-3">92–95%</td>
                <td className="px-4 py-3 text-primary font-medium">
                  {e.baseline.toolAccuracy}%
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[rgba(16,185,129,0.15)] text-[var(--success)]">
                    {e.baseline.accuracyDelta >= 0 ? "+" : ""}
                    {e.baseline.accuracyDelta} points 📈
                  </span>
                </td>
              </tr>
              <tr className="border-b border-default">
                <td className="px-4 py-3 text-primary">Missed matches</td>
                <td className="px-4 py-3">5–8%</td>
                <td className="px-4 py-3 text-primary font-medium">
                  {e.baseline.toolMissRate}%
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[rgba(16,185,129,0.15)] text-[var(--success)]">
                    {e.baseline.manualMissRate > e.baseline.toolMissRate
                      ? `${Math.round(((e.baseline.manualMissRate - e.baseline.toolMissRate) / e.baseline.manualMissRate) * 100)}% fewer 📉`
                      : "—"}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-default">
                <td className="px-4 py-3 text-primary">Audit trail</td>
                <td className="px-4 py-3">None</td>
                <td className="px-4 py-3 text-primary">Complete</td>
                <td className="px-4 py-3">
                  <span className="text-[var(--success)] text-xs">✅ New capability</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-primary">Cost per cycle</td>
                <td className="px-4 py-3">PKR ~2,000 labor</td>
                <td className="px-4 py-3 text-primary">PKR ~2 API cost</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-[rgba(16,185,129,0.15)] text-[var(--success)]">
                    99.9% cheaper 💰
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Based on client interview baseline (4–6 hours, 92–95% accuracy for ~200
          transactions monthly)
        </p>
      </section>

      <section className="evaluation-section-divider">
        <h2 className="evaluation-section-title">04 Phase Performance</h2>
        <div className="mt-4 overflow-x-auto card-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-default text-muted">
                <th className="px-4 py-3 text-left font-medium">Phase</th>
                <th className="px-4 py-3 text-right font-medium">Matches</th>
                <th className="px-4 py-3 text-right font-medium">Correct</th>
                <th className="px-4 py-3 text-right font-medium">Wrong</th>
                <th className="px-4 py-3 text-right font-medium">Accuracy</th>
                <th className="px-4 py-3 text-right font-medium">
                  Avg Confidence
                </th>
              </tr>
            </thead>
            <tbody>
              {e.phaseBreakdown.map((row) => (
                <tr key={row.phase} className="border-b border-default">
                  <td className="px-4 py-3 text-primary">
                    {phaseDot(row.phase)} {phaseLabel(row.phase)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.totalMatched}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--success)]">
                    {row.correctMatches}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--danger)]">
                    {row.incorrectMatches}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-medium ${accuracyClass(row.phaseAccuracy)}`}
                  >
                    {row.totalMatched > 0 ? `${row.phaseAccuracy}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.totalMatched > 0 ? `${row.avgConfidence}%` : "—"}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold text-primary">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{phaseTotals.totalMatched}</td>
                <td className="px-4 py-3 text-right">{phaseTotals.correctMatches}</td>
                <td className="px-4 py-3 text-right">
                  {phaseTotals.incorrectMatches}
                </td>
                <td className={`px-4 py-3 text-right ${accuracyClass(overallPhaseAccuracy)}`}>
                  {phaseTotals.totalMatched > 0
                    ? `${overallPhaseAccuracy}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="evaluation-section-divider">
        <h2 className="evaluation-section-title">05 Confidence Calibration</h2>
        <div className="mt-4 overflow-x-auto card-surface">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-default text-muted">
                <th className="px-4 py-3 text-left font-medium">Range</th>
                <th className="px-4 py-3 text-right font-medium">Matches</th>
                <th className="px-4 py-3 text-right font-medium">Correct</th>
                <th className="px-4 py-3 text-right font-medium">
                  Actual Accuracy
                </th>
                <th className="px-4 py-3 text-left font-medium">Calibrated?</th>
              </tr>
            </thead>
            <tbody>
              {e.confidenceCalibration.map((row) => (
                <tr key={row.range} className="border-b border-default">
                  <td className="px-4 py-3 text-primary">{row.range}%</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.totalPairs}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.correctPairs}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.totalPairs > 0 ? `${row.actualAccuracy}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.totalPairs === 0 ? (
                      <span className="text-muted">—</span>
                    ) : row.isCalibrated ? (
                      <span className="text-[var(--success)]">✅ Yes</span>
                    ) : (
                      <span className="text-[var(--warning)]">
                        ⚠️ Over-confident
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-secondary leading-relaxed">
          Confidence scores are well-calibrated above 85%. The 70–84% range may
          need improvement — consider routing all of these to human review.
        </p>
      </section>

      <section className="evaluation-section-divider">
        <h2 className="evaluation-section-title">06 Detailed Results</h2>
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="no-print mt-3 text-sm text-accent hover:underline"
        >
          {detailsOpen ? "Hide" : "Show"} detailed breakdown
        </button>
        {detailsOpen && (
          <div className="mt-4 overflow-x-auto card-surface max-h-[480px] overflow-y-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-default text-muted">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Bank Description</th>
                  <th className="px-3 py-2 text-left">Ledger Description</th>
                  <th className="px-3 py-2 text-center">Should</th>
                  <th className="px-3 py-2 text-center">Did</th>
                  <th className="px-3 py-2 text-center">Correct</th>
                  <th className="px-3 py-2 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {e.details.map((row, i) => (
                  <tr
                    key={`${row.bankHint}-${row.ledgerHint}-${i}`}
                    className={`border-b border-default ${
                      !row.isCorrect
                        ? "bg-[rgba(239,68,68,0.08)]"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-muted">{i + 1}</td>
                    <td className="px-3 py-2 text-primary max-w-[160px] truncate">
                      {row.bankHint || "—"}
                    </td>
                    <td className="px-3 py-2 text-primary max-w-[160px] truncate">
                      {row.ledgerHint || "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.shouldMatch ? "✅" : "❌"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.didMatch ? "✅" : "❌"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.isCorrect ? "✅" : "❌"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.confidence != null ? `${row.confidence}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function EvaluationSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-surface h-28" />
        ))}
      </div>
      <div className="card-surface h-48" />
      <div className="card-surface h-56" />
    </div>
  );
}
