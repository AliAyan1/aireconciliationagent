"use client";

import type { MatchResult } from "@/lib/types";
import { getConfidenceBreakdown } from "@/lib/confidence-breakdown";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { getMatchAIReasoning, isMatchAIScored } from "@/lib/ai-display";

interface ConfidenceBreakdownProps {
  match: MatchResult;
  showBar?: boolean;
}

export function ConfidenceBreakdown({ match, showBar }: ConfidenceBreakdownProps) {
  const lines = getConfidenceBreakdown(match);
  const total = lines.reduce((s, l) => s + l.points, 0);

  return (
    <span className="group relative inline-flex">
      <ConfidenceBadge
        confidence={match.confidence}
        isAIScored={isMatchAIScored(match)}
        aiReasoning={getMatchAIReasoning(match)}
        showBar={showBar}
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-56 rounded-lg border border-default bg-elevated p-3 text-left opacity-0 shadow-[var(--shadow-elevated)] transition-opacity group-hover:opacity-100"
      >
        <p className="text-[10px] font-semibold uppercase text-muted mb-2">
          Confidence breakdown
        </p>
        <ul className="space-y-1 text-xs text-secondary">
          {lines.map((l) => (
            <li key={l.label} className="flex justify-between gap-2">
              <span>{l.label}</span>
              <span className="text-primary tabular-nums">+{l.points}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 pt-2 border-t border-default text-xs font-semibold text-primary tabular-nums">
          Total: {match.confidence}%
          {total !== match.confidence && total > 0 ? ` (scaled from ${total})` : ""}
        </p>
      </span>
    </span>
  );
}
