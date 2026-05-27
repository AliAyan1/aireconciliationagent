"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchResult } from "@/lib/types";

const explanationCache = new Map<string, string>();

interface ExplainMatchButtonProps {
  match: MatchResult;
  className?: string;
}

export function ExplainMatchButton({ match, className = "" }: ExplainMatchButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(
    () => explanationCache.get(match.id) ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function loadExplanation() {
    if (!match.bankTransaction || !match.ledgerEntry) return;
    const cached = explanationCache.get(match.id);
    if (cached) {
      setText(cached);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match }),
      });
      const data = (await res.json()) as {
        explanation?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not explain this match");
        return;
      }
      const explanation =
        data.explanation ?? "These transactions appear to be the same payment.";
      explanationCache.set(match.id, explanation);
      setText(explanation);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) void loadExplanation();
  }

  if (!match.bankTransaction || !match.ledgerEntry) return null;

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        className="rounded-md border border-default px-2 py-1 text-xs font-medium text-accent hover:bg-[rgba(56,189,248,0.1)] transition-colors"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Why?
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute right-0 z-30 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-default bg-elevated p-3 text-left shadow-[var(--shadow-elevated)] animate-fade-up"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted mb-1.5">
            AI explanation
          </p>
          {loading && (
            <p className="text-sm text-secondary">Thinking…</p>
          )}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {!loading && !error && text && (
            <p className="text-sm text-primary leading-relaxed">{text}</p>
          )}
        </div>
      )}
    </div>
  );
}
