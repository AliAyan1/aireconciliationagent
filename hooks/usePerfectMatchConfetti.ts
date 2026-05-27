"use client";

import { useEffect } from "react";
import {
  firePerfectMatchConfetti,
  isPerfectMatch,
} from "@/lib/perfect-match-confetti";
import { playPerfectMatchCelebration } from "@/lib/ui-sounds";
import type { ReconciliationSummary } from "@/lib/types";

/**
 * Fires confetti when a session reaches 100% match (no unmatched, no review queue).
 * Once per session per browser tab (sessionStorage).
 */
export function usePerfectMatchConfetti(
  summary: ReconciliationSummary | null | undefined,
  sessionId: string | null | undefined,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !summary || !sessionId) return;
    if (!isPerfectMatch(summary)) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const storageKey = `hisaabai-perfect-${sessionId}`;
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(storageKey) === "1") return;
      sessionStorage.setItem(storageKey, "1");
    }

    playPerfectMatchCelebration();
    void firePerfectMatchConfetti();
  }, [
    enabled,
    sessionId,
    summary,
    summary?.matchRate,
    summary?.unmatched,
    summary?.needsReview,
    summary?.totalBankTxns,
  ]);
}
