import type { MatchResult } from "./types";

export interface ReviewProgressState {
  focusedReviewId: string | null;
  reviewedCount: number;
  totalToReview: number;
  savedAt: number;
}

function key(sessionId: string | null | undefined) {
  return `hisaab-review-progress-${sessionId ?? "local"}`;
}

export function computeReviewProgress(results: MatchResult[]): {
  reviewedCount: number;
  totalToReview: number;
} {
  const reviewFlow = results.filter(
    (r) =>
      !!r.bankTransaction &&
      !!r.ledgerEntry &&
      (r.status === "review" || r.status === "approved" || r.status === "rejected")
  );
  const reviewedCount = reviewFlow.filter(
    (r) => r.status === "approved" || r.status === "rejected"
  ).length;
  return { reviewedCount, totalToReview: reviewFlow.length };
}

export function saveReviewProgress(
  sessionId: string | null | undefined,
  state: Omit<ReviewProgressState, "savedAt">
) {
  if (typeof sessionStorage === "undefined") return;
  const payload: ReviewProgressState = { ...state, savedAt: Date.now() };
  sessionStorage.setItem(key(sessionId), JSON.stringify(payload));
}

export function loadReviewProgress(
  sessionId: string | null | undefined
): ReviewProgressState | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(key(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReviewProgressState;
  } catch {
    return null;
  }
}

export function clearReviewProgress(sessionId: string | null | undefined) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(key(sessionId));
}

