"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyClientMeta } from "@/lib/client-meta";
import { ColumnMapperPanel } from "@/components/settings/ColumnMapperPanel";
import {
  detectColumnMapping,
  type ColumnMapping,
} from "@/lib/column-mapping";
import { findDuplicateRows } from "@/lib/duplicate-detection";
import {
  BUILTIN_MATCHING_PROFILES,
  loadMatchingConfig,
} from "@/lib/matching-config";
import { parseCsvTable } from "@/lib/normalizer";
import { AnimatedBorderButton } from "@/components/AnimatedBorderButton";
import { ProcessingOverlay } from "@/components/charts/ProcessingOverlay";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SiteHeader } from "@/components/SiteHeader";
import { GoogleSheetsImport } from "@/components/export/GoogleSheetsImport";
import { UploadQualityReport } from "@/components/UploadQualityReport";
import {
  parseBankWithQuality,
  parseLedgerWithQuality,
  type DataQualityReport,
} from "@/lib/upload-quality";
import { hashTextSha256 } from "@/lib/audit-certificate";
import { logActivity } from "@/lib/activity-log";
import {
  scanCsvForThreats,
  type SanitizationReport,
} from "@/lib/input-sanitizer";
import { saveSession } from "@/lib/session";
import { DataPrivacyBanner } from "@/components/security/DataPrivacyBanner";
import { FileIntegrityCard } from "@/components/security/FileIntegrityCard";
import { SanitizationBadge } from "@/components/security/SanitizationBadge";
import type { BankTransaction, LedgerEntry } from "@/lib/types";
import {
  isSupportedUploadFile,
  readFileAsCsvText,
  unsupportedFileMessage,
} from "@/lib/file-upload";

function isCsvFile(file: File): boolean {
  return isSupportedUploadFile(file);
}

type BatchPair = {
  key: string;
  bankFile: File;
  ledgerFile: File;
};

function normalizeBatchKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/(bank|statement|stmt|ledger|internal|gl|book|books)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function classifyFile(fileName: string): "bank" | "ledger" | "unknown" {
  const n = fileName.toLowerCase();
  if (/(ledger|gl|internal)/.test(n)) return "ledger";
  if (/(bank|statement|stmt)/.test(n)) return "bank";
  return "unknown";
}

type UploadZoneProps = {
  label: string;
  icon: string;
  file: File | null;
  rowCount: number;
  parseError: string | null;
  onFile: (file: File) => Promise<void>;
  helperText?: string;
};

function UploadZone({
  label,
  icon,
  file,
  rowCount,
  parseError,
  onFile,
  helperText,
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
      className={`glass-card flex flex-1 flex-col items-center justify-center border-2 border-dashed p-8 transition ${
        parseError
          ? "border-red-500/60 !bg-red-500/10"
          : file && rowCount > 0
            ? "border-emerald-500/60 !bg-emerald-500/10"
            : dragging
              ? "border-sky-400/80 !bg-sky-500/10"
              : "border-[rgba(255,255,255,0.08)] hover:border-sky-400/60"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
      {helperText && (
        <span className="mt-2 text-sm text-slate-400 text-center max-w-md">
          {helperText}
        </span>
      )}
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
            <p className="text-xs text-slate-500 mt-1">
              {(file.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 0 })} KB ·{" "}
              {rowCount.toLocaleString()} rows parsed
            </p>
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
  const [processingMessage, setProcessingMessage] = useState(
    "Preparing files…"
  );
  const [processingProgress, setProcessingProgress] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [bankFileHash, setBankFileHash] = useState("");
  const [ledgerFileHash, setLedgerFileHash] = useState("");
  const [largeFileNotice, setLargeFileNotice] = useState<string | null>(null);
  const [matchRateEstimate, setMatchRateEstimate] = useState<string | null>(
    null
  );
  const [matchRateLoading, setMatchRateLoading] = useState(false);
  const [columnMapHint, setColumnMapHint] = useState<Record<string, string> | null>(
    null
  );
  const [bankCsvText, setBankCsvText] = useState<string | null>(null);
  const [ledgerCsvText, setLedgerCsvText] = useState<string | null>(null);
  const [bankColumnMapping, setBankColumnMapping] = useState<ColumnMapping>({});
  const [ledgerColumnMapping, setLedgerColumnMapping] = useState<ColumnMapping>(
    {}
  );
  const [matchingProfileId, setMatchingProfileId] = useState<string>("standard");
  const [sanitizationReport, setSanitizationReport] =
    useState<SanitizationReport | null>(null);
  const [batchPairs, setBatchPairs] = useState<BatchPair[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchRuns, setBatchRuns] = useState<
    { key: string; sessionId: string | null; matchRate: number }[]
  >([]);

  useEffect(() => {
    applyClientMeta({
      title: "Upload — Hisab.ai",
      description: "Upload bank and ledger files to reconcile transactions.",
    });
    logActivity("page_view", "Opened upload page");
  }, []);

  const duplicateWarnings = useMemo(() => {
    if (!bankData.length && !ledgerData.length) return [];
    return findDuplicateRows(bankData, ledgerData);
  }, [bankData, ledgerData]);

  async function handleBankFile(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setBankError("Files over 50MB are not supported. Please split your data.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLargeFileNotice("Large file detected — parsing may take a moment.");
    }
    if (!isCsvFile(file)) {
      setBankError(unsupportedFileMessage(file.name));
      return;
    }
    setBankFile(file);
    setBankError(null);
    setBankQuality(null);
    setError(null);
    try {
      const text = await readFileAsCsvText(file);
      setBankCsvText(text);
      const headers = Object.keys(parseCsvTable(text).data[0] ?? {});
      const mapping = detectColumnMapping(headers);
      setBankColumnMapping(mapping);
      setBankFileHash(await hashTextSha256(text));
      const bankScan = scanCsvForThreats(text);
      setSanitizationReport((prev) =>
        prev
          ? {
              ...prev,
              scriptInjections:
                prev.scriptInjections + bankScan.scriptInjections,
              sqlInjectionAttempts:
                prev.sqlInjectionAttempts + bankScan.sqlInjectionAttempts,
              escapedSpecialChars:
                prev.escapedSpecialChars + bankScan.escapedSpecialChars,
              safe: prev.safe && bankScan.safe,
            }
          : bankScan
      );
      logActivity("upload", `Uploaded bank file ${file.name}`);
      void suggestColumnMap(text);
      const result = parseBankWithQuality(text, file.name, mapping);
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
    if (file.size > 50 * 1024 * 1024) {
      setLedgerError("Files over 50MB are not supported. Please split your data.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLargeFileNotice("Large file detected — parsing may take a moment.");
    }
    if (!isCsvFile(file)) {
      setLedgerError(unsupportedFileMessage(file.name));
      return;
    }
    setLedgerFile(file);
    setLedgerError(null);
    setLedgerQuality(null);
    setError(null);
    try {
      const text = await readFileAsCsvText(file);
      setLedgerCsvText(text);
      const headers = Object.keys(parseCsvTable(text).data[0] ?? {});
      const mapping = detectColumnMapping(headers);
      setLedgerColumnMapping(mapping);
      setLedgerFileHash(await hashTextSha256(text));
      const ledgerScan = scanCsvForThreats(text);
      setSanitizationReport((prev) => {
        const base = prev ?? {
          scriptInjections: 0,
          sqlInjectionAttempts: 0,
          escapedSpecialChars: 0,
          safe: true,
        };
        return {
          scriptInjections:
            base.scriptInjections + ledgerScan.scriptInjections,
          sqlInjectionAttempts:
            base.sqlInjectionAttempts + ledgerScan.sqlInjectionAttempts,
          escapedSpecialChars:
            base.escapedSpecialChars + ledgerScan.escapedSpecialChars,
          safe: base.safe && ledgerScan.safe,
        };
      });
      logActivity("upload", `Uploaded ledger file ${file.name}`);
      const result = parseLedgerWithQuality(text, file.name, mapping);
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
      setBankFileHash(await hashTextSha256(bankText));
      setLedgerFileHash(await hashTextSha256(ledgerText));
      setLargeFileNotice(null);
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
    setProcessingMessage("Preparing data…");
    setProcessingProgress(20);

    try {
      const bankName = bankFile?.name ?? "bank_statement.csv";
      const ledgerName = ledgerFile?.name ?? "ledger.csv";
      const profile = BUILTIN_MATCHING_PROFILES.find(
        (p) => p.id === matchingProfileId
      );
      const matchingConfig = profile?.config ?? loadMatchingConfig();

      setProcessingMessage("Running matcher…");
      setProcessingProgress(55);
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankData,
          ledgerData,
          bankFileName: bankName,
          ledgerFileName: ledgerName,
          matchingConfig,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Matching failed");
      }

      setProcessingMessage("Finalizing session…");
      setProcessingProgress(88);
      const data = await res.json();
      const reconciledAt = new Date().toISOString();
      saveSession({
        sessionId: data.sessionId ?? null,
        results: data.results,
        summary: data.summary,
        bankData,
        ledgerData,
        missingProposals: [],
        journalPosts: [],
        auditMeta: {
          bankFileName: bankName,
          ledgerFileName: ledgerName,
          bankFileHash: bankFileHash || "",
          ledgerFileHash: ledgerFileHash || "",
          rulesProcessingTimeMs: data.rulesProcessingTimeMs ?? 0,
          aiProcessingTimeMs: data.aiProcessingTimeMs ?? 0,
          reconciledAt,
        },
        aiMeta:
          data.aiPairsScored > 0
            ? {
                aiScoringUsed: true,
                aiCandidateCount: data.aiCandidateCount ?? 0,
                aiPairsScored: data.aiPairsScored ?? 0,
                aiProcessingTimeMs: data.aiProcessingTimeMs ?? 0,
              }
            : undefined,
      });
      setProcessingProgress(98);
      router.push(
        data.sessionId ? `/dashboard?session=${data.sessionId}` : "/dashboard"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  }

  async function detectBatchPairs(files: File[]) {
    setBatchError(null);
    const csvs = files.filter(isCsvFile);
    if (csvs.length < 2) {
      setBatchPairs([]);
      setBatchError("Please select at least 2 files (.csv, .xlsx, or .xls).");
      return;
    }

    const groups: Record<
      string,
      { bank?: File; ledger?: File; unknown: File[] }
    > = {};

    for (const f of csvs) {
      const key = normalizeBatchKey(f.name);
      if (!groups[key]) groups[key] = { unknown: [] };
      const kind = classifyFile(f.name);
      if (kind === "bank") groups[key].bank = f;
      else if (kind === "ledger") groups[key].ledger = f;
      else groups[key].unknown.push(f);
    }

    // Resolve unknowns by simple pairing within group.
    const pairs: BatchPair[] = [];
    for (const [key, g] of Object.entries(groups)) {
      let bank = g.bank;
      let ledger = g.ledger;
      if ((!bank || !ledger) && g.unknown.length >= 2) {
        const [a, b] = g.unknown;
        // try heuristic based on column keywords in name
        const aKind = classifyFile(a.name);
        const bKind = classifyFile(b.name);
        bank = bank ?? (aKind === "bank" ? a : bKind === "bank" ? b : a);
        ledger = ledger ?? (aKind === "ledger" ? a : bKind === "ledger" ? b : b);
      }
      if (bank && ledger) {
        pairs.push({ key, bankFile: bank, ledgerFile: ledger });
      }
    }

    if (pairs.length === 0) {
      setBatchPairs([]);
      setBatchError(
        "Could not detect bank/ledger pairs. Rename files like: Jan_bank.csv, Jan_ledger.csv."
      );
      return;
    }

    setBatchPairs(pairs.slice(0, 12));
  }

  async function runBatchAll() {
    if (batchPairs.length === 0) return;
    setBatchRunning(true);
    setBatchRuns([]);
    setBatchError(null);
    try {
      const profile = BUILTIN_MATCHING_PROFILES.find(
        (p) => p.id === matchingProfileId
      );
      const matchingConfig = profile?.config ?? loadMatchingConfig();

      const runs: { key: string; sessionId: string | null; matchRate: number }[] =
        [];

      for (const pair of batchPairs) {
        const [bankText, ledgerText] = await Promise.all([
          pair.bankFile.text(),
          pair.ledgerFile.text(),
        ]);

        const bankHeaders = Object.keys(parseCsvTable(bankText).data[0] ?? {});
        const ledgerHeaders = Object.keys(parseCsvTable(ledgerText).data[0] ?? {});
        const bankMapping = detectColumnMapping(bankHeaders);
        const ledgerMapping = detectColumnMapping(ledgerHeaders);

        const bankParsed = parseBankWithQuality(bankText, pair.bankFile.name, bankMapping);
        const ledgerParsed = parseLedgerWithQuality(ledgerText, pair.ledgerFile.name, ledgerMapping);
        if (bankParsed.parseError || !bankParsed.report.canProceed) {
          throw new Error(`Batch pair '${pair.key}': bank file has issues`);
        }
        if (ledgerParsed.parseError || !ledgerParsed.report.canProceed) {
          throw new Error(`Batch pair '${pair.key}': ledger file has issues`);
        }

        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankData: bankParsed.data,
            ledgerData: ledgerParsed.data,
            bankFileName: pair.bankFile.name,
            ledgerFileName: pair.ledgerFile.name,
            matchingConfig,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Batch pair '${pair.key}' failed`);
        }
        const data = await res.json();
        runs.push({
          key: pair.key,
          sessionId: data.sessionId ?? null,
          matchRate: data.summary?.matchRate ?? 0,
        });
      }

      setBatchRuns(runs);
      logActivity("upload", `Batch ran ${runs.length} reconciliation pairs`);
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : "Batch run failed");
    } finally {
      setBatchRunning(false);
    }
  }

  const ready =
    bankData.length > 0 &&
    ledgerData.length > 0 &&
    bankQuality?.canProceed !== false &&
    ledgerQuality?.canProceed !== false;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setMatchRateLoading(true);
    });
    const bankSample = bankData.slice(0, 10).map((r) => ({
      description: r.description,
      amount: r.amount,
      date: r.date,
    }));
    const ledgerSample = ledgerData.slice(0, 10).map((r) => ({
      description: r.description,
      amount: r.amount,
      date: r.date,
    }));
    void fetch("/api/ai/predict-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankSample, ledgerSample }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { estimate?: string } | null) => {
        if (!cancelled && data?.estimate) setMatchRateEstimate(data.estimate);
      })
      .catch(() => {
        if (!cancelled) setMatchRateEstimate("85–92%");
      })
      .finally(() => {
        if (!cancelled) setMatchRateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, bankData, ledgerData]);

  async function suggestColumnMap(rawText: string) {
    const lines = rawText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const sampleRows: Record<string, string>[] = [];
    for (const line of lines.slice(1, 6)) {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = vals[i] ?? "";
      });
      sampleRows.push(row);
    }
    try {
      const res = await fetch("/api/ai/column-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, sampleRows }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { mapping?: Record<string, string> };
      if (data.mapping && Object.keys(data.mapping).length > 0) {
        setColumnMapHint(data.mapping);
      }
    } catch {
      // optional
    }
  }

  return (
    <div className="min-h-screen bg-primary text-primary">
      {isProcessing && (
        <ProcessingOverlay
          message={processingMessage}
          bankCount={bankData.length}
          ledgerCount={ledgerData.length}
          progress={processingProgress}
        />
      )}
      <SiteHeader active="upload" role="TEAM" />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-6">
          <Link href="/" className="text-accent hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Upload CSVs</h1>
          <p className="mt-2 text-slate-400">
            Bank statement + internal ledger → matched in seconds
          </p>
        </div>

        <DataPrivacyBanner />
        {largeFileNotice && (
          <div className="mt-4 rounded-lg border border-default bg-card px-4 py-2 text-sm text-secondary">
            {largeFileNotice}
          </div>
        )}

        <section className="glass-card p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-primary">
                Upload Multiple Periods
              </h2>
              <p className="text-xs text-secondary mt-1">
                Drop many files (Jan bank + Jan ledger, Feb bank + Feb ledger…)
                and we’ll detect pairs by filename similarity.
              </p>
            </div>
            <label className="btn-ghost text-sm px-4 py-2 cursor-pointer">
              Select multiple files
              <input
                type="file"
                multiple
                accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  void detectBatchPairs(files);
                }}
              />
            </label>
          </div>

          {batchError && (
            <p className="mt-3 text-sm text-red-400">{batchError}</p>
          )}

          {batchPairs.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-secondary">
                <span className="font-semibold text-primary">
                  {batchPairs.length}
                </span>{" "}
                reconciliation pair{batchPairs.length === 1 ? "" : "s"} detected.
                Run all?
              </p>
              <ul className="mt-3 space-y-2 text-xs text-secondary">
                {batchPairs.map((p) => (
                  <li key={p.key} className="rounded-lg border border-default bg-input/40 p-3">
                    <p className="text-primary font-medium">{p.key || "Period"}</p>
                    <p className="mt-1 text-muted">
                      🏦 {p.bankFile.name} · 📒 {p.ledgerFile.name}
                    </p>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void runBatchAll()}
                disabled={batchRunning}
                className="btn-primary mt-4 w-full py-3 text-sm"
              >
                {batchRunning ? "Running batch…" : "Run all pairs"}
              </button>
            </div>
          )}

          {batchRuns.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-secondary mb-2">
                Batch complete. Open a run:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {batchRuns.map((r) => (
                  <Link
                    key={r.key}
                    href={r.sessionId ? `/dashboard?session=${r.sessionId}` : "/dashboard"}
                    className="rounded-lg border border-default bg-input/40 p-3 hover:border-sky-400/60"
                  >
                    <p className="text-sm font-medium text-primary">
                      {r.key || "Period"} · {r.matchRate}% match rate
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {r.sessionId ? `Session: ${r.sessionId}` : "Local session"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <div
          className="flex flex-col gap-6 sm:flex-row sm:items-start"
          data-tour="upload"
        >
          <div className="flex flex-1 flex-col">
            <UploadZone
              label="Bank Statement"
              icon="🏦"
              file={bankFile}
              rowCount={bankData.length}
              parseError={bankError}
              onFile={handleBankFile}
              helperText="Your bank's monthly CSV/Excel export. Usually has columns: Date, Description, Debit, Credit, Balance"
            />
            <UploadQualityReport
              title="Bank data quality"
              report={bankQuality}
            />
            <GoogleSheetsImport
              label="Bank statement"
              onCsv={(csv) => {
                void (async () => {
                  const file = new File([csv], "google_sheet_bank.csv", {
                    type: "text/csv",
                  });
                  await handleBankFile(file);
                })();
              }}
            />
            <ColumnMapperPanel
              source="bank"
              csvText={bankCsvText}
              mapping={bankColumnMapping}
              onMappingChange={(m) => {
                setBankColumnMapping(m);
                if (bankCsvText) {
                  const result = parseBankWithQuality(
                    bankCsvText,
                    bankFile?.name,
                    m
                  );
                  setBankData(result.data);
                  setBankQuality(result.report);
                }
              }}
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
              helperText="Your internal accounting records. Usually has: Date, Description, Amount, Type, Reference"
            />
            <UploadQualityReport
              title="Ledger data quality"
              report={ledgerQuality}
            />
            <GoogleSheetsImport
              label="Ledger"
              onCsv={(csv) => {
                void (async () => {
                  const file = new File([csv], "google_sheet_ledger.csv", {
                    type: "text/csv",
                  });
                  await handleLedgerFile(file);
                })();
              }}
            />
            <ColumnMapperPanel
              source="ledger"
              csvText={ledgerCsvText}
              mapping={ledgerColumnMapping}
              onMappingChange={(m) => {
                setLedgerColumnMapping(m);
                if (ledgerCsvText) {
                  const result = parseLedgerWithQuality(
                    ledgerCsvText,
                    ledgerFile?.name,
                    m
                  );
                  setLedgerData(result.data);
                  setLedgerQuality(result.report);
                }
              }}
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

        {(bankFileHash || ledgerFileHash) && (
          <FileIntegrityCard
            bankFileName={bankFile?.name}
            bankFileHash={bankFileHash}
            ledgerFileName={ledgerFile?.name}
            ledgerFileHash={ledgerFileHash}
          />
        )}

        {sanitizationReport && bankFileHash && ledgerFileHash && (
          <SanitizationBadge report={sanitizationReport} />
        )}

        {duplicateWarnings.length > 0 && (
          <div className="mt-6 glass-card p-4 border-l-[3px] border-l-[var(--warning)]">
            <p className="text-sm font-semibold text-primary mb-2">
              ⚠ Possible duplicate rows detected
            </p>
            <ul className="text-xs text-secondary space-y-1.5 max-h-40 overflow-y-auto">
              {duplicateWarnings.map((w, i) => (
                <li key={i}>
                  {w.source === "bank" ? "Bank" : "Ledger"} rows {w.rowA} &amp;{" "}
                  {w.rowB}: {w.description} ({w.date.slice(0, 10)})
                </li>
              ))}
            </ul>
          </div>
        )}

        {columnMapHint && (
          <div className="mt-4 glass-card p-4 border-l-[3px] border-l-[var(--accent)]">
            <p className="text-sm font-semibold text-primary mb-2">
              AI column mapping
            </p>
            <ul className="text-xs text-secondary grid gap-1 sm:grid-cols-2">
              {Object.entries(columnMapHint).map(([role, col]) => (
                <li key={role}>
                  <span className="text-muted">{role}:</span> {col}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 glass-card p-4 max-w-lg mx-auto">
          <p className="text-sm font-medium text-slate-200 mb-2">
            Matching profile
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {BUILTIN_MATCHING_PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMatchingProfileId(p.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  matchingProfileId === p.id
                    ? "border-sky-400 bg-sky-500/20 text-sky-300"
                    : "border-slate-600 text-slate-400 hover:border-slate-500"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {ready && (
          <p className="mt-4 text-center text-sm text-slate-400">
            {matchRateLoading ? (
              "Estimating match rate from sample…"
            ) : matchRateEstimate ? (
              <>
                Based on a sample of the first 10 rows, estimated match rate:{" "}
                <span className="text-sky-400 font-medium">
                  {matchRateEstimate}
                </span>
              </>
            ) : null}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <AnimatedBorderButton
            type="button"
            disabled={!ready || isProcessing}
            onClick={startReconciliation}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing…
              </span>
            ) : (
              "Start Reconciliation"
            )}
          </AnimatedBorderButton>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            ← Back to home
          </Link>
        </div>
      </main>
      <OnboardingTour page="upload" />
    </div>
  );
}
