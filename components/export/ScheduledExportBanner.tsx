"use client";

import { getScheduledExportReminder } from "@/lib/scheduled-export";

export function ScheduledExportBanner() {
  const message = getScheduledExportReminder();
  if (!message) return null;

  return (
    <div className="glass-card p-3 mb-4 border-l-[3px] border-l-[var(--accent)] text-sm text-secondary">
      📅 {message}
    </div>
  );
}
