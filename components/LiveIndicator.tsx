"use client";

export function LiveIndicator({ lastUpdated }: { lastUpdated: Date | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] px-2 py-0.5 text-[var(--success)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
        </span>
        Live
      </span>
      {lastUpdated && (
        <span>
          Updated {lastUpdated.toLocaleTimeString("en-PK", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}
