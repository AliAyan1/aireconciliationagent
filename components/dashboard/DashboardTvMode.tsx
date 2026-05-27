"use client";

import { useCallback, useEffect, useState } from "react";
import { buildStatusDonutData, computeMatchRatePercent } from "@/lib/chart-data";
import type { MatchResult, ReconciliationSummary } from "@/lib/types";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

interface DashboardTvModeProps {
  summary: ReconciliationSummary;
  results: MatchResult[];
}

function TvDonut({ results, matchRate }: { results: MatchResult[]; matchRate: number }) {
  const data = buildStatusDonutData(results);
  if (!data.length) return null;
  return (
    <div className="relative h-64 w-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={72}
            outerRadius={100}
            stroke="transparent"
            isAnimationActive
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-bold text-primary tabular-nums">{matchRate}%</span>
        <span className="text-sm text-muted">matched</span>
      </div>
    </div>
  );
}

export function DashboardTvMode({ summary, results }: DashboardTvModeProps) {
  const [open, setOpen] = useState(false);
  const matchRate = computeMatchRatePercent(results);

  const exit = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") exit();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, exit]);

  async function enterTv() {
    setOpen(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // fullscreen optional
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => void enterTv()}
        className="btn-ghost text-sm px-4 py-2"
      >
        TV Mode
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center p-8">
      <button
        type="button"
        onClick={exit}
        className="absolute top-6 right-6 btn-ghost text-sm"
      >
        Exit TV Mode
      </button>
      <p className="text-sm uppercase tracking-widest text-muted mb-8">HisaabAI Live</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 mb-12 w-full max-w-5xl">
        {[
          { label: "Total", value: summary.totalBankTxns, color: "text-accent" },
          { label: "Auto matched", value: summary.autoMatched, color: "text-[var(--success)]" },
          { label: "Review", value: summary.needsReview, color: "text-[var(--warning)]" },
          { label: "Unmatched", value: summary.unmatched, color: "text-[var(--danger)]" },
          { label: "Posted", value: summary.posted ?? 0, color: "text-[var(--purple)]" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-6 text-center">
            <p className={`text-4xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <TvDonut results={results} matchRate={matchRate} />
      <p className="mt-8 text-5xl font-extrabold text-accent tabular-nums">{matchRate}%</p>
      <p className="text-lg text-secondary mt-1">overall match rate</p>
    </div>
  );
}
