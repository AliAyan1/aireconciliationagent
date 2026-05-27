"use client";

interface AnomalyFlagBadgeProps {
  reason: string;
  className?: string;
}

export function AnomalyFlagBadge({ reason, className = "" }: AnomalyFlagBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.35)] px-2 py-0.5 text-xs text-[var(--danger)] cursor-help ${className}`}
      title={reason}
      aria-label={`Flagged: ${reason}`}
    >
      <span aria-hidden>🚩</span>
      <span className="max-w-[140px] truncate hidden sm:inline">Flagged</span>
    </span>
  );
}
