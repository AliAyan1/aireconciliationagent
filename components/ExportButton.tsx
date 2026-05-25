"use client";

import type { MatchResult } from "@/lib/types";

interface ExportButtonProps {
  results: MatchResult[];
}

export function ExportButton({ results }: ExportButtonProps) {
  async function handleExport() {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results }),
    });

    if (!res.ok) {
      alert("Export failed. Please try again.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reconciliation-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 font-medium text-white hover:from-sky-400 hover:to-indigo-400"
    >
      Download Reconciliation Report
    </button>
  );
}
