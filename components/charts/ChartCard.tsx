"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { toPng } from "html-to-image";

interface ChartCardProps {
  title: string;
  subtitle: string;
  chartId: string;
  children: ReactNode;
  className?: string;
  minHeight?: number;
}

export function ChartCard({
  title,
  subtitle,
  chartId,
  children,
  className = "",
  minHeight = 280,
}: ChartCardProps) {
  const captureRef = useRef<HTMLDivElement>(null);

  const downloadPng = useCallback(async () => {
    if (!captureRef.current) return;
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--bg-card")
          .trim() || "#0c1222",
      });
      const link = document.createElement("a");
      link.download = `hisaab-${chartId}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // ignore capture failures (e.g. empty chart)
    }
  }, [chartId]);

  return (
    <div
      className={`glass-card p-4 md:p-5 flex flex-col ${className}`}
      style={{ minHeight }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void downloadPng()}
          className="btn-ghost shrink-0 px-2 py-1 text-[10px] uppercase tracking-wide"
        >
          Download Chart
        </button>
      </div>
      <div ref={captureRef} className="flex-1 min-h-0 chart-capture-root">
        {children}
      </div>
    </div>
  );
}
