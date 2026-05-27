import type { SanitizationReport } from "@/lib/input-sanitizer";
import { formatSanitizationMessage } from "@/lib/input-sanitizer";

interface SanitizationBadgeProps {
  report: SanitizationReport | null;
}

export function SanitizationBadge({ report }: SanitizationBadgeProps) {
  if (!report) return null;

  return (
    <div
      className={`mt-4 glass-card p-3 text-xs ${
        report.safe
          ? "border-l-[3px] border-l-emerald-500/70 text-secondary"
          : "border-l-[3px] border-l-amber-500/70 text-amber-200"
      }`}
    >
      <span className="text-emerald-400 font-medium">✓ </span>
      {formatSanitizationMessage(report)}
    </div>
  );
}
