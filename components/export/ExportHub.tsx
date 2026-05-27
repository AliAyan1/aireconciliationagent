"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { EvaluationResult } from "@/lib/evaluator";
import { resolveSessionAuditMeta, type SessionAuditMeta } from "@/lib/audit-certificate";
import { APP_REPORT_TITLE } from "@/lib/branding";
import { downloadCsvReport } from "@/lib/client-export";
import { downloadExcelReport } from "@/lib/excel-export";
import {
  filterJournalByTemplate,
  filterResultsByTemplate,
  maskMatchResults,
} from "@/lib/export-data";
import {
  DEFAULT_REPORT_TEMPLATE,
  loadActiveTemplate,
  loadReportTemplates,
  saveReportTemplates,
  setActiveTemplateId,
  type ReportTemplate,
  type ReportWatermark,
} from "@/lib/export-templates";
import { buildMailtoReportLink } from "@/lib/email-report";
import { downloadReconciliationPdf } from "@/lib/pdf-export";
import { recordReportExport } from "@/lib/report-versions";
import { markScheduledExportDone } from "@/lib/scheduled-export";
import {
  compareSnapshots,
  loadSnapshotsForSession,
  saveSessionSnapshot,
} from "@/lib/session-comparison";
import { logActivity } from "@/lib/activity-log";
import { AuditCertificateButton } from "@/components/security/AuditCertificateButton";
import { ShareResultsButton } from "@/components/security/ShareResultsButton";
import type { BankTransaction, JournalPost, LedgerEntry, MatchResult, ReconciliationSummary } from "@/lib/types";

interface ExportHubProps {
  results: MatchResult[];
  summary: ReconciliationSummary;
  sessionId?: string | null;
  auditMeta?: SessionAuditMeta;
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
  journalPosts?: JournalPost[];
  evaluation?: EvaluationResult | null;
  onExportCsv?: () => void;
}

export function ExportHub({
  results,
  summary,
  sessionId,
  auditMeta,
  bankData,
  ledgerData,
  journalPosts = [],
  onExportCsv,
}: ExportHubProps) {
  const [template, setTemplate] = useState<ReportTemplate>(DEFAULT_REPORT_TEMPLATE);
  const [watermark, setWatermark] = useState<ReportWatermark>("none");
  const [comparisonText, setComparisonText] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    setTemplate(loadActiveTemplate());
  }, []);

  const periodLabel = new Date().toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });

  const exportData = useMemo(() => {
    let filtered = filterResultsByTemplate(results, template);
    if (template.maskSensitive) {
      filtered = maskMatchResults(filtered);
    }
    const journal = filterJournalByTemplate(journalPosts, template);
    return { filtered, journal };
  }, [results, template, journalPosts]);

  async function resolveAudit() {
    return resolveSessionAuditMeta({
      ...auditMeta,
      bankData,
      ledgerData,
      rulesProcessingTimeMs: auditMeta?.rulesProcessingTimeMs ?? 0,
      aiProcessingTimeMs: auditMeta?.aiProcessingTimeMs ?? 0,
      reconciledAt: auditMeta?.reconciledAt ?? new Date().toISOString(),
    });
  }

  const trackExport = useCallback(
    async (format: string, note: string) => {
      markScheduledExportDone();
      await recordReportExport(sessionId, format, note, {
        matchRate: summary.matchRate,
      });
    },
    [sessionId, summary.matchRate]
  );

  async function handleCsv() {
    try {
      const audit = await resolveAudit();
      const ok = await downloadCsvReport({
        results: exportData.filtered,
        sessionId,
        audit,
        bankData,
        ledgerData,
      });
      if (!ok) {
        toast.error("Export failed");
        return;
      }
      await trackExport("csv", "CSV export");
      logActivity("export", "Exported reconciliation CSV");
      toast.success("CSV downloaded");
      onExportCsv?.();
    } catch {
      toast.error("Export failed");
    }
  }

  async function handlePdf() {
    try {
      const audit = await resolveAudit();
      await downloadReconciliationPdf(exportData.filtered, summary, {
        title: APP_REPORT_TITLE,
        auditMeta: audit,
        sessionId,
        watermark,
        includeEvaluation: template.includeEvaluation,
      });
      await trackExport("pdf", `PDF (${watermark})`);
      logActivity("export", `Exported PDF (${watermark})`);
      toast.success("PDF downloaded");
    } catch {
      toast.error("PDF export failed");
    }
  }

  function handleExcel() {
    try {
      downloadExcelReport(
        exportData.filtered,
        summary,
        exportData.journal
      );
      void trackExport("xlsx", "Excel export");
      toast.success("Excel downloaded");
    } catch {
      toast.error("Excel export failed");
    }
  }

  async function handleJournal() {
    try {
      const res = await fetch("/api/journal-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId ?? undefined,
          journalPosts: exportData.journal,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hisaab-journal-log.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Journal log downloaded");
    } catch {
      toast.error("Journal export failed");
    }
  }

  function saveTemplate() {
    const name = templateName.trim() || `Template ${Date.now()}`;
    const next: ReportTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      name,
    };
    const list = [...loadReportTemplates().filter((t) => t.id !== next.id), next];
    saveReportTemplates(list);
    setActiveTemplateId(next.id);
    setTemplate(next);
    setTemplateName("");
    toast.success("Template saved");
  }

  function runComparison() {
    const sid = sessionId ?? "local";
    const snaps = loadSnapshotsForSession(sid);
    if (snaps.length === 0) {
      saveSessionSnapshot(sid, results, summary, "Baseline run");
      toast.success("Baseline saved — re-run reconciliation to compare");
      return;
    }
    const prev = snaps[snaps.length - 1];
    const report = compareSnapshots(prev, results, summary);
    setComparisonText(report.narrative);
    saveSessionSnapshot(sid, results, summary);
  }

  return (
    <div className="no-print gradient-border p-6 md:p-8">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-primary">
          Export {APP_REPORT_TITLE}
        </h3>
        <p className="mt-2 text-sm text-secondary max-w-lg mx-auto">
          PDF with title page, confusion matrix, and audit trail · Excel with
          color-coded sheets · CSV for analysis
        </p>
      </div>

      {comparisonText && (
        <p className="mb-4 text-sm text-secondary rounded-lg border border-default bg-input/50 p-3">
          {comparisonText}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 mb-6 text-sm">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase text-muted">
            Report template
          </legend>
          {(
            [
              ["includeMatched", "Include matched"],
              ["includeUnmatched", "Include unmatched"],
              ["includeJournal", "Include journal"],
              ["includeEvaluation", "Include evaluation"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-secondary">
              <input
                type="checkbox"
                checked={template[key]}
                onChange={(e) =>
                  setTemplate((t) => ({ ...t, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-2 text-secondary">
            <input
              type="checkbox"
              checked={template.maskSensitive}
              onChange={(e) =>
                setTemplate((t) => ({ ...t, maskSensitive: e.target.checked }))
              }
            />
            Export with masked data
          </label>
          <label className="block text-secondary">
            Min amount (PKR)
            <input
              type="number"
              min={0}
              step={1000}
              value={template.minAmountPkr || ""}
              onChange={(e) =>
                setTemplate((t) => ({
                  ...t,
                  minAmountPkr: Number(e.target.value) || 0,
                }))
              }
              className="input-field mt-1 w-full px-2 py-1 text-sm"
            />
          </label>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="input-field flex-1 px-2 py-1 text-xs"
            />
            <button type="button" className="btn-ghost text-xs px-2" onClick={saveTemplate}>
              Save
            </button>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase text-muted">
            PDF watermark
          </legend>
          {(
            [
              ["none", "None"],
              ["draft", "DRAFT"],
              ["final", "FINAL"],
              ["confidential", "CONFIDENTIAL"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-secondary">
              <input
                type="radio"
                name="watermark"
                checked={watermark === value}
                onChange={() => setWatermark(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <button type="button" className="btn-primary px-5 py-2.5 text-sm" onClick={() => void handleCsv()}>
          Download CSV
        </button>
        <button type="button" className="btn-ghost px-5 py-2.5 text-sm" onClick={() => void handlePdf()}>
          Download PDF
        </button>
        <button type="button" className="btn-ghost px-5 py-2.5 text-sm" onClick={handleExcel}>
          Download Excel
        </button>
        <button type="button" className="btn-ghost px-5 py-2.5 text-sm" onClick={() => void handleJournal()}>
          Journal log CSV
        </button>
        <a
          href={buildMailtoReportLink(summary, periodLabel)}
          className="btn-ghost px-5 py-2.5 text-sm inline-flex items-center"
        >
          Email report
        </a>
        <button type="button" className="btn-ghost px-5 py-2.5 text-sm" onClick={runComparison}>
          Compare runs
        </button>
        <AuditCertificateButton
          results={results}
          auditMeta={auditMeta}
          sessionId={sessionId}
          bankData={bankData}
          ledgerData={ledgerData}
        />
        <ShareResultsButton
          results={results}
          summary={summary}
          sessionId={sessionId}
          auditMeta={auditMeta}
        />
      </div>
    </div>
  );
}

export const ExportSection = ExportHub;
export const ExportButton = ExportHub;
