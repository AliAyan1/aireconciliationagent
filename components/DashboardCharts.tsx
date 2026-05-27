"use client";

import { Fragment, useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  buildAmountChartData,
  buildBeforeAfterData,
  buildConfidenceHistogram,
  buildHeatmapSample,
  buildPhaseStackedRow,
  buildSankeyFlows,
  buildSparklineTrend,
  buildStatusDonutData,
  buildTimelineData,
  buildTreemapData,
  CHART_COLORS,
  computeMatchRatePercent,
  topConfidenceMatches,
} from "@/lib/chart-data";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
  ReconciliationSummary,
} from "@/lib/types";

interface DashboardChartsProps {
  results: MatchResult[];
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
  summary?: ReconciliationSummary;
}

type TooltipPayload = { name?: string; value?: number; payload?: { fill?: string } };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        background: CHART_COLORS.tooltipBg,
        border: `1px solid ${CHART_COLORS.tooltipBorder}`,
      }}
    >
      {label && <p className="text-secondary mb-1">{label}</p>}
      <p className="font-semibold text-primary">
        {item.name ?? "Value"}: {item.value}
      </p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-full min-h-[200px] flex items-center justify-center text-sm text-muted">
      {message}
    </div>
  );
}

function MatchRateDonut({
  data,
  matchRate,
}: {
  data: ReturnType<typeof buildStatusDonutData>;
  matchRate: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart message="No match data yet" />;

  return (
    <div
      className={`relative h-[260px] transition-opacity duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={105}
            paddingAngle={2}
            stroke="transparent"
            isAnimationActive
            animationDuration={900}
            animationBegin={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-bold text-primary tabular-nums">{matchRate}%</span>
        <span className="text-xs text-muted mt-0.5">matched</span>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-1.5 text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
            {d.name} ({d.value})
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhaseStackedBar({ row }: { row: ReturnType<typeof buildPhaseStackedRow>[0] }) {
  const total = row.exact + row.near + row.fuzzy + row.ai;
  if (total === 0) return <EmptyChart message="No phased matches yet" />;

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart
        layout="vertical"
        data={[row]}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" hide />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="exact" stackId="a" fill={CHART_COLORS.exact} name="Exact" />
        <Bar dataKey="near" stackId="a" fill={CHART_COLORS.near} name="Near" />
        <Bar dataKey="fuzzy" stackId="a" fill={CHART_COLORS.fuzzy} name="Fuzzy" />
        <Bar dataKey="ai" stackId="a" fill={CHART_COLORS.ai} name="AI" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SankeyDiagram({ flows }: { flows: ReturnType<typeof buildSankeyFlows> }) {
  const bank = flows.find((f) => f.id === "bank");
  const mid = flows.filter((f) =>
    ["exact", "near", "fuzzy", "ai", "unmatched"].includes(f.id)
  );
  const ledger = flows.find((f) => f.id === "ledger");
  const bankVal = bank?.value ?? 1;

  return (
    <div className="space-y-3 py-2">
      <div className="rounded-lg bg-input px-3 py-2 text-sm font-medium text-primary">
        {bank?.label} ({bank?.value})
      </div>
      {mid.map((f) => (
        <div key={f.id} className="flex items-center gap-2">
          <div
            className="h-3 rounded-full transition-all"
            style={{
              width: `${Math.max(8, (f.value / bankVal) * 100)}%`,
              background: f.color,
              opacity: 0.85,
            }}
          />
          <span className="text-xs text-secondary shrink-0">
            {f.label} ({f.value})
          </span>
        </div>
      ))}
      <div className="rounded-lg bg-input px-3 py-2 text-sm font-medium text-[var(--purple)]">
        → {ledger?.label} ({ledger?.value})
      </div>
    </div>
  );
}

function RadialGauge({ confidence, label }: { confidence: number; label: string }) {
  const pct = Math.min(100, Math.max(0, confidence));
  const angle = -90 + (pct / 100) * 180;
  const color =
    pct >= 85
      ? CHART_COLORS.autoMatched
      : pct >= 60
        ? CHART_COLORS.needsReview
        : CHART_COLORS.unmatched;

  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="48" viewBox="0 0 80 48" aria-hidden>
        <path
          d="M 8 40 A 32 32 0 0 1 72 40"
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 8 40 A 32 32 0 0 1 72 40"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 100} 100`}
        />
        <line
          x1="40"
          y1="40"
          x2={40 + 28 * Math.cos((angle * Math.PI) / 180)}
          y2={40 + 28 * Math.sin((angle * Math.PI) / 180)}
          stroke="var(--text-primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-bold tabular-nums text-primary">{pct}%</span>
      <span className="text-[9px] text-muted truncate max-w-[72px]">{label}</span>
    </div>
  );
}

function HeatmapGrid({
  data,
}: {
  data: ReturnType<typeof buildHeatmapSample>;
}) {
  const { banks, ledgers, cells } = data;
  if (!banks.length || !ledgers.length) {
    return <EmptyChart message="Not enough data for heatmap" />;
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${ledgers.length + 1}, minmax(28px, 1fr))`,
        }}
      >
        <div />
        {ledgers.map((l) => (
          <div key={l.label} className="text-[9px] text-center text-muted">
            {l.label}
          </div>
        ))}
        {banks.map((b) => (
          <Fragment key={b.label}>
            <div className="text-[9px] text-muted pr-1">{b.label}</div>
            {ledgers.map((l) => {
              const cell = cells.find((c) => c.bank === b.i && c.ledger === l.i);
              const c = cell?.confidence ?? 0;
              return (
                <div
                  key={`${b.i}-${l.i}`}
                  title={`${c}% confidence`}
                  className="h-7 w-7 rounded-sm border border-default"
                  style={{
                    background: cell?.matched
                      ? `rgba(16, 185, 129, ${0.2 + c / 120})`
                      : `rgba(56, 189, 248, ${c / 200})`,
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

const TreemapContent = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, name, fill } = props;
  if (width < 4 || height < 4) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="var(--bg-primary)"
        strokeWidth={2}
        rx={4}
      />
      {width > 40 && height > 20 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={9}
        >
          {name}
        </text>
      )}
    </g>
  );
};

export function DashboardCharts({
  results,
  bankData = [],
  ledgerData = [],
}: DashboardChartsProps) {
  const statusData = useMemo(() => buildStatusDonutData(results), [results]);
  const matchRate = useMemo(() => computeMatchRatePercent(results), [results]);
  const phaseRow = useMemo(() => buildPhaseStackedRow(results)[0], [results]);
  const confidenceData = useMemo(
    () => buildConfidenceHistogram(results),
    [results]
  );
  const amountData = useMemo(() => buildAmountChartData(results), [results]);
  const timelineData = useMemo(
    () => buildTimelineData(bankData, ledgerData),
    [bankData, ledgerData]
  );
  const sankeyFlows = useMemo(() => buildSankeyFlows(results), [results]);
  const treemapData = useMemo(() => buildTreemapData(results), [results]);
  const beforeAfter = useMemo(() => buildBeforeAfterData(results), [results]);
  const heatmap = useMemo(() => buildHeatmapSample(results), [results]);
  const gauges = useMemo(() => topConfidenceMatches(results, 8), [results]);

  if (results.length === 0) return null;

  return (
    <section className="mt-4" aria-label="Charts and visualizations">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-primary">Charts &amp; visualization</h2>
          <p className="text-sm text-secondary">
            Match health, phases, amounts, and flow through the engine
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <ChartCard
          title="Match rate"
          subtitle="Auto matched · needs review · unmatched"
          chartId="match-rate-donut"
          className="lg:col-span-1"
          minHeight={320}
        >
          <MatchRateDonut data={statusData} matchRate={matchRate} />
        </ChartCard>
        <ChartCard
          title="Phase distribution"
          subtitle="Exact · near · fuzzy · AI (stacked)"
          chartId="phase-stacked"
          className="lg:col-span-2"
        >
          <PhaseStackedBar row={phaseRow} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Confidence distribution"
          subtitle="Buckets 0–10 through 90–100"
          chartId="confidence-histogram"
        >
          {confidenceData.every((d) => d.count === 0) ? (
            <EmptyChart message="No confidence data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={confidenceData} margin={{ left: -16, bottom: 0 }}>
                <XAxis dataKey="range" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill={CHART_COLORS.confidenceBar} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard
          title="Before / after AI"
          subtitle="Estimated impact of AI scoring layer"
          chartId="before-after"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={beforeAfter} margin={{ left: -8 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="metric" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="before"
                name="Before AI"
                fill="rgba(148, 163, 184, 0.5)"
                radius={[4, 4, 0, 0]}
                isAnimationActive
              />
              <Bar
                dataKey="after"
                name="After AI"
                fill={CHART_COLORS.ai}
                radius={[4, 4, 0, 0]}
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Amount distribution"
          subtitle="Transactions sorted by PKR amount, colored by status"
          chartId="amount-chart"
        >
          {amountData.length === 0 ? (
            <EmptyChart message="No amounts" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={amountData}>
                <XAxis dataKey="index" hide />
                <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <ChartTooltip
                        active
                        label={`PKR ${(payload[0].payload as { amount: number }).amount.toLocaleString()}`}
                        payload={[
                          {
                            name: (payload[0].payload as { status: string }).status,
                            value: (payload[0].payload as { amount: number }).amount,
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                  {amountData.map((e) => (
                    <Cell key={e.id} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard
          title="Volume timeline"
          subtitle="Bank (sky) vs ledger (purple) per day"
          chartId="timeline"
        >
          {timelineData.length === 0 ? (
            <EmptyChart message="Upload data with dates" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timelineData}>
                <CartesianGrid stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: CHART_COLORS.axis, fontSize: 9 }}
                  tickFormatter={(v) => String(v).slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="bank"
                  name="Bank"
                  stroke={CHART_COLORS.bankLine}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ledger"
                  name="Ledger"
                  stroke={CHART_COLORS.ledgerLine}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Sankey flow"
          subtitle="Bank → match phase → ledger"
          chartId="sankey"
        >
          <SankeyDiagram flows={sankeyFlows} />
        </ChartCard>
        <ChartCard
          title="Amount treemap"
          subtitle="Size = amount · color = status"
          chartId="treemap"
        >
          {treemapData.length === 0 ? (
            <EmptyChart message="No transactions" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <Treemap
                data={treemapData}
                dataKey="size"
                nameKey="name"
                stroke="var(--bg-primary)"
                content={<TreemapContent />}
              >
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div
                        className="rounded-lg px-3 py-2 text-xs"
                        style={{
                          background: CHART_COLORS.tooltipBg,
                          border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                        }}
                      >
                        <p className="text-primary font-medium">
                          {(payload[0].payload as { name: string }).name}
                        </p>
                        <p className="text-secondary">
                          PKR{" "}
                          {(
                            payload[0].payload as { amount: number }
                          ).amount.toLocaleString()}
                        </p>
                      </div>
                    ) : null
                  }
                />
              </Treemap>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Radial confidence"
          subtitle="Speedometer view per top match"
          chartId="radial-confidence"
        >
          {gauges.length === 0 ? (
            <EmptyChart message="No scored matches" />
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {gauges.map((r) => (
                <RadialGauge
                  key={r.id}
                  confidence={r.confidence}
                  label={r.bankTransaction?.description?.slice(0, 12) ?? r.id.slice(0, 6)}
                />
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard
          title="Match pattern heatmap"
          subtitle="Bank × ledger confidence (sampled)"
          chartId="heatmap"
          minHeight={320}
        >
          <HeatmapGrid data={heatmap} />
        </ChartCard>
      </div>
    </section>
  );
}

export { buildSparklineTrend };
