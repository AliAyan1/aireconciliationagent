"use client";

import { useMemo } from "react";
import {
  computeAchievementBadges,
  countEarnedBadges,
  type BadgeContext,
} from "@/lib/achievement-badges";

interface AchievementBadgesProps {
  context: BadgeContext;
}

export function AchievementBadges({ context }: AchievementBadgesProps) {
  const badges = useMemo(
    () => computeAchievementBadges(context),
    [context]
  );
  const earnedCount = countEarnedBadges(badges);

  if (context.summary.totalBankTxns === 0) return null;

  return (
    <section className="no-print mt-6" aria-label="Achievement badges">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-primary">Achievements</h2>
        <p className="text-xs text-muted">
          {earnedCount} of {badges.length} earned
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`card-surface relative overflow-hidden p-3 sm:p-4 transition-all duration-300 ${
              badge.earned
                ? "border-[rgba(56,189,248,0.35)] bg-[rgba(56,189,248,0.06)] shadow-[var(--shadow-glow)]"
                : "opacity-45 saturate-50"
            }`}
          >
            {badge.earned && (
              <span
                className="absolute right-2 top-2 rounded-full bg-[rgba(16,185,129,0.2)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--success)]"
                aria-hidden
              >
                ✓
              </span>
            )}
            <span className="text-2xl sm:text-3xl leading-none" aria-hidden>
              {badge.emoji}
            </span>
            <p className="mt-2 text-sm font-semibold text-primary leading-tight">
              {badge.title}
            </p>
            <p className="mt-1 text-[10px] sm:text-xs text-muted leading-snug">
              {badge.tagline}
            </p>
          </div>
        ))}
      </div>
      {earnedCount === 0 && (
        <p className="mt-2 text-xs text-muted">
          Upload and reconcile to unlock badges — aim for high match rate, speed,
          and a clean books.
        </p>
      )}
    </section>
  );
}
