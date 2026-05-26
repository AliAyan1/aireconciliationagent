"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { MatchResult, ReconciliationSummary } from "@/lib/types";
import { downloadCsvReport } from "@/lib/client-export";
import { buildSummaryEmailDraft } from "@/lib/email-draft";
import { APP_REPORT_TITLE } from "@/lib/branding";
import { downloadReconciliationPdf } from "@/lib/pdf-export";

interface ExportSectionProps {
  results: MatchResult[];
  summary: ReconciliationSummary;
  sessionId?: string | null;
  onExportCsv?: () => void;
}

export function ExportSection({
  results,
  summary,
  sessionId,
  onExportCsv,
}: ExportSectionProps) {
  const [showEmail, setShowEmail] = useState(false);
  const emailDraft = buildSummaryEmailDraft(
    summary,
    new Date().toLocaleDateString("en-PK", { month: "long", year: "numeric" })
  );

  async function handleExportCsv() {
    try {
      const ok = await downloadCsvReport(results, sessionId);
      if (!ok) {
        toast.error("Export failed. Please try again.");
        return;
      }
      toast.success("📥 Report downloaded");
      setShowEmail(true);
      onExportCsv?.();
    } catch {
      toast.error("Export failed. Please try again.");
    }
  }

  async function handleExportPdf() {
    try {
      await downloadReconciliationPdf(results, summary, APP_REPORT_TITLE);
      toast.success("📥 PDF report downloaded");
      setShowEmail(true);
    } catch {
      toast.error("PDF export failed.");
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(emailDraft);
      toast.success("Email draft copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <div className="gradient-border p-6 md:p-8 text-center">
      <h3 className="text-lg font-semibold text-primary">
        Download {APP_REPORT_TITLE}
      </h3>
      <p className="mt-2 text-sm text-secondary max-w-lg mx-auto">
        Includes all matched, reviewed, and unmatched transactions with audit
        trail
      </p>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => void handleExportCsv()}
          className="btn-primary w-full sm:w-auto px-8 py-3 text-sm"
          aria-label="Download CSV report"
        >
          Download CSV →
        </button>
        <button
          type="button"
          onClick={() => void handleExportPdf()}
          className="btn-ghost w-full sm:w-auto px-8 py-3 text-sm"
          aria-label="Download PDF report"
        >
          Download PDF →
        </button>
      </div>

      {(showEmail || results.length > 0) && (
        <div className="mt-8 text-left max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => setShowEmail((v) => !v)}
            className="text-sm text-accent hover:underline"
          >
            {showEmail ? "Hide" : "Show"} draft summary email
          </button>
          {showEmail && (
            <div className="mt-3 rounded-lg bg-input border border-default p-4">
              <pre className="text-xs text-secondary whitespace-pre-wrap font-sans">
                {emailDraft}
              </pre>
              <button
                type="button"
                onClick={() => void copyEmail()}
                className="btn-primary mt-4 w-full py-2 text-sm"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ExportButton = ExportSection;
