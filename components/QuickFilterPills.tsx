"use client";

export type QuickFilterKey =
  | "all"
  | "high_confidence"
  | "needs_review"
  | "large_amount"
  | "today";

export interface QuickFilter {
  key: QuickFilterKey;
  label: string;
}

export const QUICK_FILTERS: QuickFilter[] = [
  { key: "all", label: "All" },
  { key: "high_confidence", label: "High Confidence" },
  { key: "needs_review", label: "Needs Review" },
  { key: "large_amount", label: "Amount > 50K" },
  { key: "today", label: "Today's Date" },
];

interface QuickFilterPillsProps {
  active: Set<QuickFilterKey>;
  onChange: (next: Set<QuickFilterKey>) => void;
}

export function QuickFilterPills({ active, onChange }: QuickFilterPillsProps) {
  function toggle(key: QuickFilterKey) {
    if (key === "all") {
      onChange(new Set<QuickFilterKey>(["all"]));
      return;
    }
    const next = new Set(active);
    next.delete("all");
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    if (next.size === 0) next.add("all");
    onChange(next);
  }

  const hasActiveFilter = !active.has("all") || active.size > 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUICK_FILTERS.map((f) => {
        const isActive =
          f.key === "all" ? active.has("all") && active.size === 1 : active.has(f.key);
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => toggle(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-accent"
                : "border-default text-muted hover:border-[var(--accent)]/60 hover:text-secondary"
            }`}
          >
            {f.label}
          </button>
        );
      })}
      {hasActiveFilter && (
        <button
          type="button"
          onClick={() => onChange(new Set<QuickFilterKey>(["all"]))}
          className="text-xs text-muted hover:text-secondary underline ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
