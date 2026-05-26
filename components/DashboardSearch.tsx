"use client";

interface DashboardSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
}

export function DashboardSearch({
  value,
  onChange,
  resultCount,
  totalCount,
}: DashboardSearchProps) {
  const trimmed = value.trim();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="relative flex-1 max-w-xl">
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search descriptions, amounts, references, dates…"
          className="input-field w-full pl-4 pr-10 py-2.5 text-sm"
          aria-label="Search transactions across all tabs"
        />
        {trimmed && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-accent text-sm px-2"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      {trimmed && (
        <p className="text-sm text-secondary shrink-0">
          <span className="text-accent font-medium tabular-nums">{resultCount}</span>{" "}
          result{resultCount === 1 ? "" : "s"} for &quot;{trimmed}&quot;
          <span className="text-muted"> / {totalCount}</span>
        </p>
      )}
    </div>
  );
}
