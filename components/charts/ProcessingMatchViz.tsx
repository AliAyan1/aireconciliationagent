"use client";

import { useEffect, useState } from "react";

interface ProcessingMatchVizProps {
  bankCount: number;
  ledgerCount: number;
  active?: boolean;
}

export function ProcessingMatchViz({
  bankCount,
  ledgerCount,
  active = true,
}: ProcessingMatchVizProps) {
  const [progress, setProgress] = useState(0);
  const bankRows = Math.min(6, Math.max(3, Math.ceil(bankCount / 40)));
  const ledgerRows = Math.min(6, Math.max(3, Math.ceil(ledgerCount / 40)));
  const pairs = Math.min(bankRows, ledgerRows);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 500);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, bankCount, ledgerCount]);

  return (
    <div className="w-full max-w-lg mx-auto py-4" aria-hidden>
      <div className="flex justify-between gap-4 relative h-40">
        <div className="flex flex-col justify-between flex-1">
          {Array.from({ length: bankRows }).map((_, i) => (
            <div
              key={`b-${i}`}
              className="h-2 rounded bg-[rgba(56,189,248,0.35)] animate-pulse-subtle"
              style={{ width: `${70 + (i % 3) * 10}%`, opacity: 0.4 + progress * 0.6 }}
            />
          ))}
          <p className="text-[10px] text-accent mt-2">Bank</p>
        </div>
        <svg className="absolute inset-0 w-full h-32 pointer-events-none">
          {Array.from({ length: pairs }).map((_, i) => {
            const y1 = 12 + i * (80 / Math.max(1, pairs - 1));
            const y2 = 12 + (pairs - 1 - i) * (80 / Math.max(1, pairs - 1));
            const show = progress > (i + 1) / (pairs + 1);
            return (
              <line
                key={`line-${i}`}
                x1="8%"
                y1={y1}
                x2="92%"
                y2={y2}
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeOpacity={show ? 0.7 : 0}
                style={{ transition: "stroke-opacity 0.15s ease" }}
              />
            );
          })}
        </svg>
        <div className="flex flex-col justify-between flex-1 items-end">
          {Array.from({ length: ledgerRows }).map((_, i) => (
            <div
              key={`l-${i}`}
              className="h-2 rounded bg-[rgba(139,92,246,0.35)] animate-pulse-subtle"
              style={{
                width: `${65 + (i % 3) * 12}%`,
                opacity: 0.4 + progress * 0.6,
              }}
            />
          ))}
          <p className="text-[10px] text-[var(--purple)] mt-2">Ledger</p>
        </div>
      </div>
      <p className="text-center text-xs text-muted mt-2">Matching transactions…</p>
    </div>
  );
}
