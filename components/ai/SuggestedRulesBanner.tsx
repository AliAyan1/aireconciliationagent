"use client";

import { useEffect, useState } from "react";
import {
  addSuggestedRule,
  loadSuggestedRules,
  suggestRuleFromApprovals,
} from "@/lib/review-feedback";

export function SuggestedRulesBanner() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string[]>([]);

  useEffect(() => {
    setSuggestion(suggestRuleFromApprovals());
    setAccepted(loadSuggestedRules());
  }, []);

  if (!suggestion || accepted.includes(suggestion)) return null;

  return (
    <div className="glass-card p-4 mb-4 border-l-[3px] border-l-[var(--purple)]">
      <p className="text-xs font-semibold uppercase text-[var(--purple)] mb-1">
        AI-suggested rule
      </p>
      <p className="text-sm text-secondary mb-3">{suggestion}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary text-xs px-3 py-1.5"
          onClick={() => {
            addSuggestedRule(suggestion);
            setAccepted([...accepted, suggestion]);
          }}
        >
          Accept
        </button>
        <button
          type="button"
          className="btn-ghost text-xs px-3 py-1.5"
          onClick={() => setSuggestion(null)}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
