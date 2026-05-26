import type { MatchType } from "@/lib/types";

export function MatchTypeBadge({ matchType }: { matchType: MatchType }) {
  const map: Record<MatchType, string> = {
    exact:
      "border-[rgba(16,185,129,0.4)] text-[var(--success)] bg-[rgba(16,185,129,0.08)]",
    near: "border-[rgba(59,130,246,0.4)] text-[var(--info)] bg-[rgba(59,130,246,0.08)]",
    fuzzy:
      "border-[rgba(245,158,11,0.4)] text-[var(--warning)] bg-[rgba(245,158,11,0.08)]",
    ai_scored:
      "border-[rgba(139,92,246,0.4)] text-[var(--purple)] bg-[rgba(139,92,246,0.08)]",
    generated:
      "border-[rgba(139,92,246,0.4)] text-[var(--purple)] bg-[rgba(139,92,246,0.08)]",
    unmatched:
      "border-default text-muted bg-card",
  };

  const labels: Record<MatchType, string> = {
    exact: "Exact",
    near: "Near",
    fuzzy: "Fuzzy",
    ai_scored: "✦ AI",
    generated: "Generated",
    unmatched: "—",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${map[matchType]}`}
    >
      {labels[matchType]}
    </span>
  );
}
