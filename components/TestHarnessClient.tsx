"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { TestReport } from "@/components/TestReport";
import type { TestRunResult } from "@/lib/test-runner";

export function TestHarnessClient() {
  const [datasetName, setDatasetName] = useState("Manual test run");
  const [bankCSV, setBankCSV] = useState("");
  const [ledgerCSV, setLedgerCSV] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestRunResult | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/test-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCSV, ledgerCSV, datasetName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Test run failed");
      }
      setResult(data.result as TestRunResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test run failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary">
      <SiteHeader active="upload" role="TEAM" />
      <main className="mx-auto max-w-[1000px] px-4 py-8 md:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-primary">Dataset test harness</h1>
          <p className="mt-1 text-sm text-secondary">
            Run the rules-based matching engine against any bank + ledger CSV pair
            and inspect metrics, phase mix, and data-quality issues.
          </p>
        </header>

        <div className="card-surface p-5 space-y-4 mb-6">
          <label className="block text-sm">
            <span className="text-secondary">Dataset name</span>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2 text-sm text-primary"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-secondary">Bank CSV</span>
              <textarea
                value={bankCSV}
                onChange={(e) => setBankCSV(e.target.value)}
                rows={8}
                className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2 text-xs font-mono text-primary"
                placeholder="Paste bank statement CSV…"
              />
            </label>
            <label className="block text-sm">
              <span className="text-secondary">Ledger CSV</span>
              <textarea
                value={ledgerCSV}
                onChange={(e) => setLedgerCSV(e.target.value)}
                rows={8}
                className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2 text-xs font-mono text-primary"
                placeholder="Paste ledger CSV…"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={loading || !bankCSV.trim() || !ledgerCSV.trim()}
            className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
          >
            {loading ? "Running…" : "Run test suite"}
          </button>
          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}
        </div>

        {result && <TestReport result={result} />}
      </main>
    </div>
  );
}
