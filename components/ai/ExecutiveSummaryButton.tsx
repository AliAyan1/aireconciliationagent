"use client";

import { useState } from "react";
import type { MatchResult, ReconciliationSummary } from "@/lib/types";

interface ExecutiveSummaryButtonProps {
  results: MatchResult[];
  summary: ReconciliationSummary;
}

export function ExecutiveSummaryButton({
  results,
  summary,
}: ExecutiveSummaryButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch("/api/ai/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, summary }),
      });
      const data = (await res.json()) as { text?: string };
      setText(data.text ?? "Could not generate summary.");
    } catch {
      setText("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void generate()}
        disabled={loading}
        className="btn-ghost text-xs px-3 py-1.5"
      >
        Generate Executive Summary
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-primary mb-3">
              Executive summary
            </h3>
            {loading ? (
              <p className="text-sm text-muted">Writing…</p>
            ) : (
              <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                {text}
              </p>
            )}
            <button
              type="button"
              className="btn-primary mt-6 w-full py-2 text-sm"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
