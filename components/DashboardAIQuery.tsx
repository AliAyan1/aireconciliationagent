"use client";

import { useState } from "react";
import type { MatchResult } from "@/lib/types";

export type DashboardTab = "auto" | "review" | "unmatched";

export interface NLQueryState {
  message: string;
  matchIds: string[] | null;
  tab?: DashboardTab;
}

interface DashboardAIQueryProps {
  results: MatchResult[];
  onResult: (state: NLQueryState | null) => void;
  disabled?: boolean;
}

export function DashboardAIQuery({
  results,
  onResult,
  disabled,
}: DashboardAIQueryProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || results.length === 0) return;

    setLoading(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, results }),
      });
      const data = (await res.json()) as NLQueryState & { error?: string };
      if (!res.ok) {
        setLocalError(data.error ?? data.message ?? "Query failed");
        return;
      }
      onResult({
        message: data.message,
        matchIds: data.matchIds,
        tab: data.tab,
      });
    } catch {
      setLocalError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setQuestion("");
    setLocalError(null);
    onResult(null);
  }

  return (
    <div className="card-surface p-4 border border-default">
      <p className="text-sm font-semibold text-primary mb-1">
        Ask anything about your reconciliation
      </p>
      <p className="text-xs text-muted mb-3">
        e.g. &quot;Show unmatched above 50,000&quot; or &quot;Which matches have
        the lowest confidence?&quot;
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={disabled || loading || results.length === 0}
          placeholder="Type your question…"
          className="input-field flex-1 px-4 py-2.5 text-sm"
          aria-label="Natural language query"
        />
        <div className="flex gap-2 shrink-0">
          <button
            type="submit"
            disabled={disabled || loading || !question.trim() || results.length === 0}
            className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? "…" : "Ask"}
          </button>
          <button
            type="button"
            onClick={clear}
            className="btn-ghost px-3 py-2.5 text-sm"
          >
            Clear
          </button>
        </div>
      </form>
      {localError && (
        <p className="mt-2 text-xs text-[var(--danger)]">{localError}</p>
      )}
    </div>
  );
}
