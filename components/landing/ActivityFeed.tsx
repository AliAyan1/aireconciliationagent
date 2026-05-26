"use client";

import { useEffect, useState } from "react";

const ACTIVITY_ENTRIES = [
  { time: "Just now", message: "250 transactions matched in 3.2s" },
  { time: "2 min ago", message: "PKR 2.4M reconciled" },
  { time: "5 min ago", message: "98% match rate achieved" },
  { time: "8 min ago", message: "12 AI-scored pairs sent to review" },
  { time: "12 min ago", message: "Audit report exported to PDF" },
  { time: "15 min ago", message: "180 journal entries posted" },
] as const;

const ROTATE_MS = 4500;
const FADE_MS = 450;

export function ActivityFeed() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!motionOk) return;

    let fadeTimeout: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      setVisible(false);
      fadeTimeout = setTimeout(() => {
        setIndex((i) => (i + 1) % ACTIVITY_ENTRIES.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => {
      clearInterval(interval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, [motionOk]);

  const entry = ACTIVITY_ENTRIES[index];

  return (
    <div
      className="mt-10 w-full max-w-lg mx-auto text-left card-surface px-5 py-4 border border-default"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--success)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
          </span>
          Live activity
        </span>
      </div>

      {motionOk ? (
        <p
          className={`text-sm leading-relaxed transition-opacity duration-[450ms] ease-in-out ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-muted tabular-nums">{entry.time}</span>
          <span className="text-muted mx-2" aria-hidden>
            —
          </span>
          <span className="text-primary">{entry.message}</span>
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {ACTIVITY_ENTRIES.slice(0, 3).map((item) => (
            <li key={item.message} className="leading-relaxed">
              <span className="text-muted tabular-nums">{item.time}</span>
              <span className="text-muted mx-2" aria-hidden>
                —
              </span>
              <span className="text-primary">{item.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
