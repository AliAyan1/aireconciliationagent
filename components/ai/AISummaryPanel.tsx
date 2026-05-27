"use client";

import { useEffect, useState } from "react";
import type { MatchResult, ReconciliationSummary } from "@/lib/types";
import { ExecutiveSummaryButton } from "./ExecutiveSummaryButton";

interface AISummaryPanelProps {
  results: MatchResult[];
  summary: ReconciliationSummary;
}

export function AISummaryPanel({ results, summary }: AISummaryPanelProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results, summary }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { summary?: string } | null) => {
        if (!cancelled && data?.summary) setText(data.summary);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [results, summary]);

  return (
    <div className="glass-card p-5 border-l-[3px] border-l-[var(--accent)]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-primary">AI summary</p>
        <ExecutiveSummaryButton results={results} summary={summary} />
      </div>
      {loading && <p className="text-sm text-muted animate-pulse-subtle">Generating summary…</p>}
      {!loading && text && (
        <p className="text-sm text-secondary leading-relaxed">{text}</p>
      )}
    </div>
  );
}
