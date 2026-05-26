import type { ReconciliationSummary } from "./types";

export function isPerfectMatch(summary: ReconciliationSummary): boolean {
  if (summary.totalBankTxns <= 0) return false;
  return (
    summary.unmatched === 0 &&
    summary.needsReview === 0 &&
    summary.matchRate >= 100
  );
}

export async function firePerfectMatchConfetti(): Promise<void> {
  try {
    const confetti = (await import("canvas-confetti")).default;
    const colors = ["#38bdf8", "#10b981", "#f59e0b", "#a78bfa"];

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.55 },
      colors,
    });

    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  } catch {
    // Confetti is optional; ignore load/runtime failures
  }
}
