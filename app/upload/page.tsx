"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { UploadQualityReport } from "@/components/UploadQualityReport";
import {
  parseBankWithQuality,
  parseLedgerWithQuality,
  type DataQualityReport,
} from "@/lib/upload-quality";
import { saveSession } from "@/lib/session";
import type { BankTransaction, LedgerEntry } from "@/lib/types";

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".csv") ||
    name.endsWith(".txt") ||
    file.type === "text/csv" ||
    file.type === "text/plain" ||
    file.type === "application/vnd.ms-excel"
  );
}

type UploadZoneProps = {
  label: string;
  icon: string;
  file: File | null;
  rowCount: number;
  parseError: string | null;
  onFile: (file: File) => Promise<void>;
};

function UploadZone({
  label,
  icon,
  file,
  rowCount,
  parseError,
  onFile,
}: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (picked: File) => {
      if (!isCsvFile(picked)) return;
      await onFile(picked);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) void processFile(dropped);
    },
    [processFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={handleDrop}
      className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition ${
        parseError
          ? "border-red-500/60 bg-red-500/5"
          : file && rowCount > 0
            ? "border-emerald-500 bg-emerald-500/5"
            : dragging
              ? "border-sky-400 bg-sky-500/5"
              : "border-slate-700 hover:border-sky-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain,application/vnd.ms-excel"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void processFile(f);
        }}
      />
      <span className="text-4xl mb-3">{icon}</span>
      <span className="font-medium text-slate-200">{label}</span>
      <span className="mt-1 text-sm text-slate-500 text-center">
        Drop CSV here or click Browse
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-400 hover:text-sky-300"
      >
        Browse files
      </button>
      {file && (
        <div className="mt-4 text-center">
          <p
            className={`text-sm ${rowCount > 0 ? "text-emerald-400" : "text-amber-400"}`}
          >
            {rowCount > 0 ? "✓" : "⚠"} {file.name}
          </p>
          {rowCount > 0 && (
            <p className="text-xs text-slate-500 mt-1">{rowCount} rows parsed</p>
          )}
        </div>
      )}
      {parseError && (
        <p className="mt-3 text-center text-xs text-red-400 max-w-xs">{parseError}</p>
      )}
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [bankData, setBankData] = useState<BankTransaction[]>([]);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [bankError, setBankError] = useState<string | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [bankQuality, setBankQuality] = useState<DataQualityReport | null>(null);
  const [ledgerQuality, setLedgerQuality] = useState<DataQualityReport | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBankFile(file: File) {
    if (!isCsvFile(file)) {
      setBankError("Please choose a .csv file (not Excel .xlsx).");
      return;
    }
    setBankFile(file);
    setBankError(null);
    setBankQuality(null);
    setError(null);
    try {
      const text = await file.text();
      const result = parseBankWithQuality(text);
      setBankData(result.data);
      setBankQuality(result.report);
      if (result.parseError) {
        setBankError(result.parseError);
      } else if (!result.report.canProceed) {
        setBankError("Fix critical data quality issues before matching.");
      }
    } catch (e) {
      setBankData([]);
      setBankQuality(null);
      setBankError(e instanceof Error ? e.message : "Failed to parse bank CSV");
    }
  }

  async function handleLedgerFile(file: File) {
    if (!isCsvFile(file)) {
      setLedgerError("Please choose a .csv file (not Excel .xlsx).");
      return;
    }
    setLedgerFile(file);
    setLedgerError(null);
    setLedgerQuality(null);
    setError(null);
    try {
      const text = await file.text();
      const result = parseLedgerWithQuality(text);
      setLedgerData(result.data);
      setLedgerQuality(result.report);
      if (result.parseError) {
        setLedgerError(result.parseError);
      } else if (!result.report.canProceed) {
        setLedgerError("Fix critical data quality issues before matching.");
      }
    } catch (e) {
      setLedgerData([]);
      setLedgerQuality(null);
      setLedgerError(
        e instanceof Error ? e.message : "Failed to parse ledger CSV"
      );
    }
  }

  async function loadSamples() {
    setError(null);
    setBankError(null);
    setLedgerError(null);
    setBankQuality(null);
    setLedgerQuality(null);
    try {
      const [bankRes, ledgerRes] = await Promise.all([
        fetch("/samples/sample_bank.csv"),
        fetch("/samples/sample_ledger.csv"),
      ]);
      if (!bankRes.ok || !ledgerRes.ok) {
        throw new Error("Could not load sample files");
      }
      const bankText = await bankRes.text();
      const ledgerText = await ledgerRes.text();
      const bankResult = parseBankWithQuality(bankText);
      const ledgerResult = parseLedgerWithQuality(ledgerText);
      setBankData(bankResult.data);
      setLedgerData(ledgerResult.data);
      setBankQuality(bankResult.report);
      setLedgerQuality(ledgerResult.report);
      setBankFile(new File([bankText], "sample_bank.csv", { type: "text/csv" }));
      setLedgerFile(
        new File([ledgerText], "sample_ledger.csv", { type: "text/csv" })
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load sample files"
      );
    }
  }

  async function startReconciliation() {
    if (!bankData.length || !ledgerData.length) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankData, ledgerData }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Matching failed");
      }

      const data = await res.json();
      saveSession({
        results: data.results,
        summary: data.summary,
        bankData,
        ledgerData,
        missingProposals: [],
        journalPosts: [],
      });
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  }

  const ready =
    bankData.length > 0 &&
    ledgerData.length > 0 &&
    bankQuality?.canProceed !== false &&
    ledgerQuality?.canProceed !== false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SiteHeader active="upload" role="TEAM" />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Upload CSVs</h1>
          <p className="mt-2 text-slate-400">
            Bank statement + internal ledger → matched in seconds
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col">
            <UploadZone
              label="Bank Statement"
              icon="🏦"
              file={bankFile}
              rowCount={bankData.length}
              parseError={bankError}
              onFile={handleBankFile}
            />
            <UploadQualityReport
              title="Bank data quality"
              report={bankQuality}
            />
          </div>
          <div className="flex flex-1 flex-col">
            <UploadZone
              label="Internal Ledger"
              icon="📒"
              file={ledgerFile}
              rowCount={ledgerData.length}
              parseError={ledgerError}
              onFile={handleLedgerFile}
            />
            <UploadQualityReport
              title="Ledger data quality"
              report={ledgerQuality}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Use <code className="text-slate-400">.csv</code> files from{" "}
          <code className="text-slate-400">data/</code> — or{" "}
          <button
            type="button"
            onClick={() => void loadSamples()}
            className="text-sky-400 hover:text-sky-300 underline"
          >
            load sample CSVs
          </button>
        </p>

        {error && (
          <p className="mt-6 text-center text-sm text-red-400">{error}</p>
        )}

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={!ready || isProcessing}
            onClick={startReconciliation}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-8 py-3 font-semibold text-white disabled:opacity-50 hover:from-sky-400 hover:to-indigo-400"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing…
              </span>
            ) : (
              "Run HisaabAI"
            )}
          </button>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
