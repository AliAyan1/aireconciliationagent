"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildConfidenceHistogram,
  buildPhaseBarData,
  buildStatusDonutData,
  CHART_COLORS,
} from "@/lib/chart-data";
import type { MatchResult } from "@/lib/types";

interface DashboardChartsProps {
  results: MatchResult[];
}

type ChartTooltipItem = {
  name?: string;
  value?: number;
  payload?: { fill?: string; name?: string };
};

function toTooltipItems(
  payload: readonly object[] | undefined
): ChartTooltipItem[] | undefined {
  if (!payload?.length) return undefined;
  return payload.map((entry) => {
    const p = entry as ChartTooltipItem;
    return {
      name: p.name,
      value: p.value,
      payload: p.payload,
    };
  });
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-surface p-4 md:p-5 flex flex-col min-h-[280px]">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <p className="mt-0.5 text-xs text-muted mb-4">{subtitle}</p>
      <div className="flex-1 min-h-[220px]">{children}</div>
    </div>
  );
}

function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const seriesName = item.name ?? item.payload?.name ?? "Count";
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
        <span style={{ color: item.payload?.fill ?? CHART_COLORS.ai }}>
          {seriesName}:{" "}
        </span>
        {item.value}
      </p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted">
      {message}
    </div>
  );
}

function StatusDonut({ data }: { data: ReturnType<typeof buildStatusDonutData> }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart message="No match data yet" />;

  return (
    <div className="h-full flex flex-col">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            stroke="transparent"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<DarkTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-1.5 text-secondary">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: d.fill }}
            />
            {d.name} ({d.value})
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhaseBar({ data }: { data: ReturnType<typeof buildPhaseBarData> }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <EmptyChart message="No matched transactions yet" />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="phase"
          tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
          content={({ active, payload, label }) => (
            <DarkTooltip
              active={active}
              label={String(label)}
              payload={toTooltipItems(payload)}
            />
          )}
        />
        <Bar dataKey="count" name="Matches" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.phase} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ConfidenceHistogram({
  data,
}: {
  data: ReturnType<typeof buildConfidenceHistogram>;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <EmptyChart message="No confidence scores to chart" />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="range"
          tick={{ fill: CHART_COLORS.axis, fontSize: 10 }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
          content={({ active, payload, label }) => (
            <DarkTooltip
              active={active}
              label={`Confidence ${label}`}
              payload={toTooltipItems(payload)?.map((p) => ({
                ...p,
                name: "Transactions",
              }))}
            />
          )}
        />
        <Bar dataKey="count" name="Transactions" fill={CHART_COLORS.confidenceBar} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DashboardCharts({ results }: DashboardChartsProps) {
  const statusData = useMemo(() => buildStatusDonutData(results), [results]);
  const phaseData = useMemo(() => buildPhaseBarData(results), [results]);
  const confidenceData = useMemo(
    () => buildConfidenceHistogram(results),
    [results]
  );

  if (results.length === 0) return null;

  return (
    <section className="mt-8" aria-label="Visual summary">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-primary">Visual summary</h2>
        <p className="text-sm text-secondary">
          Match status, matching phases, and confidence distribution
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Status breakdown"
          subtitle="Auto matched vs review vs unmatched"
        >
          <StatusDonut data={statusData} />
        </ChartCard>
        <ChartCard
          title="Matches by phase"
          subtitle="Exact, near date, fuzzy, and AI scoring"
        >
          <PhaseBar data={phaseData} />
        </ChartCard>
        <ChartCard
          title="Confidence distribution"
          subtitle="How sure the engine is across matches"
        >
          <ConfidenceHistogram data={confidenceData} />
        </ChartCard>
      </div>
    </section>
  );
}
