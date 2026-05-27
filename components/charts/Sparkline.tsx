"use client";

interface SparklineProps {
  data: number[];
  stroke?: string;
  className?: string;
  trend?: "up" | "down";
}

export function Sparkline({
  data,
  stroke = "var(--accent)",
  className = "",
  trend = "up",
}: SparklineProps) {
  if (data.length < 2) return null;
  const w = 64;
  const h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const color =
    trend === "up" ? "var(--success)" : trend === "down" ? "var(--danger)" : stroke;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
