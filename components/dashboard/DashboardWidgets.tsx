"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { buildSparklineTrend } from "@/lib/chart-data";
import type { MatchResult, ReconciliationSummary } from "@/lib/types";
import { formatPKR } from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import {
  DEFAULT_WIDGET_ORDER,
  loadWidgetLayout,
  loadWidgetLocked,
  saveWidgetLayout,
  saveWidgetLocked,
  type WidgetId,
} from "@/lib/table-preferences";

interface DashboardWidgetsProps {
  summary: ReconciliationSummary;
  results?: MatchResult[];
  aiScoredCount?: number;
  showAIStat?: boolean;
  animate?: boolean;
}

function WidgetValue({
  value,
  animate,
  className,
}: {
  value: number;
  animate: boolean;
  className: string;
}) {
  const display = useAnimatedNumber(value, 1000, animate);
  return (
    <p className={`text-2xl sm:text-[28px] font-bold tabular-nums leading-none ${className}`}>
      {display}
    </p>
  );
}

const WIDGET_META: Record<
  WidgetId,
  {
    label: string;
    getValue: (s: ReconciliationSummary, ai: number) => number;
    subtitle: (s: ReconciliationSummary) => string;
    accent: string;
    valueColor: string;
    animate: boolean;
  }
> = {
  total: {
    label: "Total Transactions",
    getValue: (s) => s.totalBankTxns,
    subtitle: (s) => `${s.totalLedgerEntries} ledger entries`,
    accent: "border-l-[var(--accent)]",
    valueColor: "text-accent",
    animate: true,
  },
  auto: {
    label: "Auto Matched",
    getValue: (s) => s.autoMatched,
    subtitle: (s) => `${s.matchRate}% match rate`,
    accent: "border-l-[var(--success)]",
    valueColor: "text-[var(--success)]",
    animate: true,
  },
  review: {
    label: "Needs Review",
    getValue: (s) => s.needsReview,
    subtitle: () => "Awaiting approval",
    accent: "border-l-[var(--warning)]",
    valueColor: "text-[var(--warning)]",
    animate: true,
  },
  posted: {
    label: "Posted",
    getValue: (s) => s.posted ?? 0,
    subtitle: () => "Journal entries recorded",
    accent: "border-l-[var(--purple)]",
    valueColor: "text-[var(--purple)]",
    animate: false,
  },
  unmatched: {
    label: "Unmatched",
    getValue: (s) => s.unmatched,
    subtitle: (s) => `Diff ${formatPKR(s.difference)}`,
    accent: "border-l-[var(--danger)]",
    valueColor: "text-[var(--danger)]",
    animate: true,
  },
};

const SPARKLINE_WIDGETS: Partial<Record<WidgetId | "ai", "up" | "down">> = {
  auto: "up",
  unmatched: "down",
};

export function DashboardWidgets({
  summary,
  results = [],
  aiScoredCount = 0,
  showAIStat = false,
  animate = true,
}: DashboardWidgetsProps) {
  const [order, setOrder] = useState<WidgetId[]>([...DEFAULT_WIDGET_ORDER]);
  const [locked, setLocked] = useState(true);
  const [dragId, setDragId] = useState<WidgetId | null>(null);

  useEffect(() => {
    setOrder(loadWidgetLayout());
    setLocked(loadWidgetLocked());
  }, []);

  const persistOrder = useCallback((next: WidgetId[]) => {
    setOrder(next);
    saveWidgetLayout(next);
  }, []);

  const toggleLock = useCallback(() => {
    setLocked((prev) => {
      const next = !prev;
      saveWidgetLocked(next);
      return next;
    });
  }, []);

  function onDragStart(id: WidgetId) {
    if (locked) return;
    setDragId(id);
  }

  function onDragOver(e: React.DragEvent, targetId: WidgetId) {
    e.preventDefault();
    if (locked || !dragId || dragId === targetId) return;
  }

  function onDrop(targetId: WidgetId) {
    if (locked || !dragId || dragId === targetId) return;
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    persistOrder(next);
    setDragId(null);
  }

  const widgets: {
    id: string;
    meta: (typeof WIDGET_META)[WidgetId];
  }[] = order.map((id) => ({
    id,
    meta: WIDGET_META[id],
  }));

  if (showAIStat && aiScoredCount > 0) {
    widgets.push({
      id: "ai",
      meta: {
        label: "AI Scored",
        getValue: () => aiScoredCount,
        subtitle: () => "by GPT-4o-mini",
        accent: "border-l-[var(--accent)]",
        valueColor: "text-accent",
        animate: true,
      },
    });
  }

  return (
    <div data-tour="stats">
      <div className="mb-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={toggleLock}
          className="btn-ghost px-3 py-1.5 text-xs"
          aria-pressed={locked}
        >
          {locked ? "🔒 Locked" : "🔓 Unlocked — drag to reorder"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {widgets.map(({ id, meta }) => (
          <div
            key={id}
            draggable={!locked && id !== "ai"}
            onDragStart={() => {
              if (id !== "ai") onDragStart(id as WidgetId);
            }}
            onDragOver={(e) => onDragOver(e, id as WidgetId)}
            onDrop={() => onDrop(id as WidgetId)}
            onDragEnd={() => setDragId(null)}
            className={`glass-card border-l-[3px] p-4 sm:p-5 transition-all ${meta.accent} ${
              !locked ? "cursor-grab active:cursor-grabbing" : ""
            } ${dragId === id ? "opacity-60 ring-2 ring-[var(--accent)]" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <WidgetValue
                value={meta.getValue(summary, aiScoredCount)}
                animate={animate && meta.animate}
                className={meta.valueColor}
              />
              {results.length > 0 && SPARKLINE_WIDGETS[id as WidgetId] && (
                <Sparkline
                  data={buildSparklineTrend(
                    results,
                    id === "unmatched" ? "unmatched" : "matched"
                  )}
                  trend={SPARKLINE_WIDGETS[id as WidgetId]}
                />
              )}
            </div>
            <p className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-secondary">
              {meta.label}
            </p>
            <p className="mt-1 text-[10px] sm:text-xs text-muted">
              {meta.subtitle(summary)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
