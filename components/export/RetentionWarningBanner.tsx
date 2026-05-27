"use client";

import { getRetentionWarning } from "@/lib/data-retention";

export function RetentionWarningBanner({
  reconciledAt,
}: {
  reconciledAt?: string;
}) {
  const message = getRetentionWarning(reconciledAt);
  if (!message) return null;

  return (
    <div className="glass-card p-3 mb-4 border-l-[3px] border-l-[var(--warning)] text-sm text-[var(--warning)]">
      ⏳ {message}
    </div>
  );
}
