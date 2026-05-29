"use client";

import { useEffect, useMemo, useState } from "react";
import type { JournalPost } from "@/lib/types";
import { formatPKR, formatRelativeTime } from "@/lib/format";
import { EmptyState } from "./EmptyState";

interface JournalLogPanelProps {
  journalPosts: JournalPost[];
}

export function JournalLogPanel({ journalPosts }: JournalLogPanelProps) {
  const [filter, setFilter] = useState<"all" | "posted">("all");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(
    () =>
      [...journalPosts].sort(
        (a, b) =>
          new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      ),
    [journalPosts]
  );

  const filtered = filter === "all" ? sorted : sorted;

  if (journalPosts.length === 0) {
    return (
      <EmptyState
        icon="📓"
        title="No journal activity yet"
        message="Post matched entries or generate missing lines to build your audit trail."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary">
          {journalPosts.length} entr{journalPosts.length === 1 ? "y" : "ies"}
        </p>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all")}
          className="input-field px-3 py-1.5 text-sm"
          aria-label="Filter journal entries"
        >
          <option value="all">All actions</option>
        </select>
      </div>

      <ul className="space-y-0 border-l border-default ml-3">
        {filtered.map((j) => (
          <li key={j.id} className="relative pl-6 pb-6 animate-slide-in">
            <span
              className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--purple)] ring-4 ring-[var(--bg-primary)]"
              aria-hidden
            />
            <time
              className="text-xs text-muted"
              dateTime={j.postedAt}
              title={new Date(j.postedAt).toLocaleString("en-PK")}
            >
              {formatRelativeTime(j.postedAt, now)}
            </time>
            <p className="mt-1 text-sm text-primary">{j.narration}</p>
            <p
              className={`mt-0.5 text-xs font-mono tabular-nums ${
                j.amount < 0 ? "text-[var(--danger)]" : "text-secondary"
              }`}
            >
              {formatPKR(j.amount)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
