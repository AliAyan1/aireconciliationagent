"use client";

import { useState } from "react";
import type { MatchResult } from "@/lib/types";
import {
  countNewAIMatches,
  getMatchAIReasoning,
  isMatchAIScored,
} from "@/lib/ai-display";
import { ConfidenceBadge } from "./ConfidenceBadge";

export interface AIInsightsPanelProps {
  aiPairsScored: number;
  aiCandidateCount: number;
  aiProcessingTimeMs: number;
  aiResults: MatchResult[];
}

function formatProcessingTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function AIInsightsPanel({
  aiPairsScored,
  aiCandidateCount,
  aiProcessingTimeMs,
  aiResults,
}: AIInsightsPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const paired = aiResults.filter(
    (r) => r.bankTransaction && r.ledgerEntry && isMatchAIScored(r)
  );
  const newMatches = countNewAIMatches(paired);
  const avgConfidence =
    paired.length > 0
      ? Math.round(
          paired.reduce((sum, r) => sum + r.confidence, 0) / paired.length
        )
      : 0;

  const miniStats = [
    { label: "Pairs Analyzed", value: String(aiCandidateCount || aiPairsScored) },
    { label: "New Matches Found", value: String(newMatches) },
    { label: "Avg AI Confidence", value: `${avgConfidence}%` },
    {
      label: "Processing Time",
      value: formatProcessingTime(aiProcessingTimeMs),
    },
  ];

  return (
    <section className="card-surface border-t-2 border-t-[var(--accent)] p-5 md:p-6">
      <h2 className="text-lg font-semibold text-accent">
        <span className="mr-1.5">✦</span>
        AI Analysis
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {miniStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
          >
            <p className="text-xl font-bold text-slate-100">{stat.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen((o) => !o)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/50"
        aria-expanded={detailsOpen}
      >
        <span>AI Match Details</span>
        <span
          className={`text-sky-400 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {detailsOpen && (
        <ul className="mt-3 space-y-3">
          {paired.length === 0 ? (
            <li className="text-sm text-slate-500 py-2">
              No AI-scored pairs with both bank and ledger lines.
            </li>
          ) : (
            paired.map((r) => {
              const reasoning = getMatchAIReasoning(r);
              const statusLabel =
                r.status === "auto_matched" || r.status === "posted"
                  ? "Auto-approved"
                  : r.status === "review"
                    ? "Sent to review"
                    : r.status;

              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3"
                >
                  <p className="text-sm text-slate-200">
                    <span className="text-slate-400">Bank:</span>{" "}
                    {r.bankTransaction?.description}
                    <span className="mx-2 text-sky-500">→</span>
                    <span className="text-slate-400">Ledger:</span>{" "}
                    {r.ledgerEntry?.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <ConfidenceBadge
                      confidence={r.confidence}
                      isAIScored
                      aiReasoning={reasoning}
                    />
                    <span className="text-xs text-slate-500">{statusLabel}</span>
                    {reasoning && (
                      <p className="w-full text-xs text-slate-500 line-clamp-2">
                        {reasoning}
                      </p>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </section>
  );
}
