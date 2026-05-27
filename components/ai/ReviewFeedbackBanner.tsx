"use client";

import { useEffect, useState } from "react";
import {
  analyzeReviewPatterns,
  type AdaptiveInsight,
} from "@/lib/review-feedback";

export function ReviewFeedbackBanner() {
  const [insight, setInsight] = useState<AdaptiveInsight | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInsight(analyzeReviewPatterns());
  }, []);

  if (!insight || dismissed) return null;

  return (
    <div className="glass-card p-4 mb-4 border-l-[3px] border-l-[var(--accent)] flex flex-wrap items-start justify-between gap-3">
      <p className="text-sm text-secondary flex-1">{insight.message}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="btn-ghost text-xs px-2 py-1"
      >
        Dismiss
      </button>
    </div>
  );
}
