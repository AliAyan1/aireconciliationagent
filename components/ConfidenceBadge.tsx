interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  let colorClass = "bg-red-500/20 text-red-400 border-red-500/40";
  if (confidence > 90) {
    colorClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  } else if (confidence >= 70) {
    colorClass = "bg-amber-500/20 text-amber-400 border-amber-500/40";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {confidence}%
    </span>
  );
}
