"use client";

import { isPerfectMatch } from "@/lib/perfect-match-confetti";
import type { ReconciliationSummary } from "@/lib/types";

export function PerfectReconciliationBadge({
  summary,
}: {
  summary: ReconciliationSummary;
}) {
  if (!isPerfectMatch(summary)) return null;

  return (
    <div className="no-print mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
      <p className="text-sm font-semibold text-emerald-300">
        🎉 Perfect Reconciliation!
      </p>
      <p className="mt-1 text-xs text-secondary">
        100% match rate with no items needing review.
      </p>
    </div>
  );
}

