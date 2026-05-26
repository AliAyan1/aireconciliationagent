interface ConfidenceBadgeProps {
  confidence: number;
  isAIScored?: boolean;
  aiReasoning?: string;
  showBar?: boolean;
}

function tier(confidence: number) {
  if (confidence > 90) {
    return {
      dot: "bg-[var(--success)]",
      bar: "bg-[var(--success)]",
      pill: "bg-[rgba(16,185,129,0.12)] text-[var(--success)] border-[rgba(16,185,129,0.25)]",
    };
  }
  if (confidence >= 85) {
    return {
      dot: "bg-[var(--info)]",
      bar: "bg-[var(--info)]",
      pill: "bg-[rgba(59,130,246,0.12)] text-[var(--info)] border-[rgba(59,130,246,0.25)]",
    };
  }
  if (confidence >= 70) {
    return {
      dot: "bg-[var(--warning)]",
      bar: "bg-[var(--warning)]",
      pill: "bg-[rgba(245,158,11,0.12)] text-[var(--warning)] border-[rgba(245,158,11,0.25)]",
    };
  }
  return {
    dot: "bg-[var(--danger)]",
    bar: "bg-[var(--danger)]",
    pill: "bg-[rgba(239,68,68,0.12)] text-[var(--danger)] border-[rgba(239,68,68,0.25)]",
  };
}

export function ConfidenceBadge({
  confidence,
  isAIScored = false,
  aiReasoning,
  showBar = true,
}: ConfidenceBadgeProps) {
  const { dot, bar, pill } = tier(confidence);
  const clamped = Math.min(100, Math.max(0, confidence));

  const label = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-all duration-200 hover:animate-pulse-subtle ${pill}`}
      title={isAIScored && aiReasoning ? `AI: ${aiReasoning}` : undefined}
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} aria-hidden />
      {isAIScored && <span className="text-accent">✦</span>}
      {confidence}%
    </span>
  );

  const barEl = showBar ? (
    <span
      className="inline-block h-1 w-[60px] rounded-full bg-[var(--border-hover)] overflow-hidden align-middle"
      aria-hidden
    >
      <span
        className={`block h-full rounded-full transition-all duration-300 ${bar}`}
        style={{ width: `${clamped}%` }}
      />
    </span>
  ) : null;

  const inner = (
    <span className="inline-flex items-center gap-2">
      {label}
      {barEl}
    </span>
  );

  if (!isAIScored || !aiReasoning) return inner;

  return (
    <span className="group relative inline-flex">
      {inner}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-xs -translate-x-1/2 rounded-lg border border-default bg-elevated px-3 py-2 text-xs text-secondary opacity-0 shadow-[var(--shadow-elevated)] transition-opacity group-hover:opacity-100"
      >
        AI: {aiReasoning}
      </span>
    </span>
  );
}
