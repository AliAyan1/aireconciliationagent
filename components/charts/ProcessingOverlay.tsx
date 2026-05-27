"use client";

import { ProcessingMatchViz } from "./ProcessingMatchViz";

interface ProcessingOverlayProps {
  message: string;
  progress?: number;
  bankCount?: number;
  ledgerCount?: number;
}

export function ProcessingOverlay({
  message,
  progress,
  bankCount = 0,
  ledgerCount = 0,
}: ProcessingOverlayProps) {
  const pct = progress ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,10,18,0.85)] backdrop-blur-md"
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-4 w-full max-w-lg glass-card p-8 shadow-[var(--shadow-elevated)] animate-fade-up">
        <div className="flex flex-col items-center gap-4">
          {bankCount > 0 && ledgerCount > 0 ? (
            <ProcessingMatchViz
              bankCount={bankCount}
              ledgerCount={ledgerCount}
            />
          ) : (
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          )}
          <p className="text-center text-sm font-medium text-primary">{message}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-input">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, Math.max(pct, 8))}%`,
                background: "var(--accent-gradient)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
