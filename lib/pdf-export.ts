import QRCode from "qrcode";
import {
  buildAuditCertificateDocument,
  formatAuditCertificateParagraph,
  formatExportFooterHashes,
  shortenHash,
  type SessionAuditMeta,
} from "./audit-certificate";
import { APP_NAME, APP_REPORT_FILENAME_PREFIX, APP_REPORT_TITLE } from "./branding";
import { evaluateResults } from "./evaluator";
import { formatPKR } from "./format";
import type { ReportWatermark } from "./export-templates";
import { getSiteUrl } from "./site-url";
import type { MatchResult, ReconciliationSummary } from "./types";

export interface PdfExportOptions {
  title?: string;
  auditMeta?: SessionAuditMeta;
  sessionId?: string | null;
  watermark?: ReportWatermark;
  includeEvaluation?: boolean;
}

async function qrDataUrl(sessionUrl: string): Promise<string> {
  return QRCode.toDataURL(sessionUrl, { margin: 1, width: 120 });
}

function addWatermark(
  doc: {
    getNumberOfPages: () => number;
    setPage: (n: number) => void;
    setFontSize: (n: number) => void;
    setTextColor: (r: number, g?: number, b?: number) => void;
    text: (
      t: string,
      x: number,
      y: number,
      opts?: { align?: string; angle?: number }
    ) => void;
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  },
  label: string
) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(52);
    doc.setTextColor(220);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.text(label, w / 2, h / 2, { align: "center", angle: 45 });
  }
}

function appendAuditCertificatePage(
  doc: {
    addPage: () => void;
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
    setFontSize: (size: number) => void;
    setTextColor: (r: number, g?: number, b?: number) => void;
    text: (text: string | string[], x: number, y: number) => void;
    splitTextToSize: (text: string, maxWidth: number) => string | string[];
    setDrawColor: (color: number) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
  },
  auditMeta: SessionAuditMeta,
  results: MatchResult[],
  sessionId?: string | null
) {
  doc.addPage();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const maxW = pageW - margin * 2;
  let y = 48;

  const cert = buildAuditCertificateDocument(auditMeta, results, {
    certificateId: sessionId ?? `pdf-${Date.now()}`,
    sessionId,
  });

  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text("Audit trail", margin, y);
  y += 28;

  doc.setFontSize(11);
  doc.setTextColor(40);
  const body = formatAuditCertificateParagraph(cert);
  const bodyLines = doc.splitTextToSize(body, maxW) as string[];
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 14 + 16;

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text("Files processed", margin, y);
  y += 14;
  for (const file of cert.files) {
    const line = `• ${file.name}  ·  SHA-256: ${shortenHash(file.hash, 24)}`;
    const wrapped = doc.splitTextToSize(line, maxW) as string[];
    doc.text(wrapped, margin + 8, y);
    y += wrapped.length * 12 + 4;
  }
}

export async function downloadReconciliationPdf(
  results: MatchResult[],
  summary: ReconciliationSummary,
  options?: PdfExportOptions
): Promise<void> {
  const title = options?.title ?? APP_REPORT_TITLE;
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const generated = new Date().toLocaleString("en-PK");
  const period = new Date().toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });

  const sessionUrl = options?.sessionId
    ? `${getSiteUrl()}/dashboard?session=${options.sessionId}`
    : `${getSiteUrl()}/dashboard`;

  let qrUrl: string | null = null;
  try {
    qrUrl = await qrDataUrl(sessionUrl);
  } catch {
    qrUrl = null;
  }

  // Title page
  doc.setFontSize(28);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 40, 120);
  doc.setFontSize(14);
  doc.setTextColor(71, 85, 105);
  doc.text(`${APP_NAME} reconciliation report`, 40, 148);
  doc.text(period, 40, 170);
  doc.setFontSize(10);
  doc.text(`Generated: ${generated}`, 40, 200);
  if (options?.sessionId) {
    doc.text(`Session: ${options.sessionId}`, 40, 216);
  }
  if (qrUrl) {
    doc.addImage(qrUrl, "PNG", doc.internal.pageSize.getWidth() - 160, 100, 100, 100);
    doc.setFontSize(8);
    doc.text("Scan to verify online", doc.internal.pageSize.getWidth() - 155, 210);
  }

  doc.addPage();

  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text("Executive summary", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${generated}`, 40, 58);

  autoTable(doc, {
    startY: 72,
    head: [["Metric", "Value"]],
    body: [
      ["Total bank transactions", String(summary.totalBankTxns)],
      ["Ledger entries", String(summary.totalLedgerEntries)],
      ["Auto matched", String(summary.autoMatched)],
      ["Needs review", String(summary.needsReview)],
      ["Unmatched", String(summary.unmatched)],
      ["Match rate", `${summary.matchRate}%`],
      ["Amount difference", formatPKR(summary.difference)],
    ],
    theme: "grid",
    headStyles: { fillColor: [56, 189, 248] },
    styles: { fontSize: 9 },
  });

  if (options?.includeEvaluation !== false) {
    const totalMs =
      (options?.auditMeta?.rulesProcessingTimeMs ?? 0) +
      (options?.auditMeta?.aiProcessingTimeMs ?? 0);
    const evaluation = evaluateResults(
      results,
      totalMs,
      options?.auditMeta?.aiProcessingTimeMs ?? 0
    );

    const lastT = (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable;
    let y = (lastT?.finalY ?? 72) + 24;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Confusion matrix (evaluation)", 40, y);

    autoTable(doc, {
      startY: y + 8,
      head: [["", "Predicted match", "Predicted no match"]],
      body: [
        [
          "Actual match",
          String(evaluation.truePositives),
          String(evaluation.falseNegatives),
        ],
        [
          "Actual no match",
          String(evaluation.falsePositives),
          String(evaluation.trueNegatives),
        ],
      ],
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    const lastE = (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable;
    y = (lastE?.finalY ?? y) + 16;
    doc.setFontSize(9);
    doc.text(
      `Precision ${evaluation.precision}% · Recall ${evaluation.recall}% · F1 ${evaluation.f1Score}%`,
      40,
      y
    );
  }

  const matchedRows = results
    .filter((r) => r.status !== "unmatched" || (r.bankTransaction && r.ledgerEntry))
    .slice(0, 120)
    .map((r) => [
      r.status,
      r.matchType,
      String(r.confidence),
      r.bankTransaction?.description?.slice(0, 40) ?? "",
      r.bankTransaction ? formatPKR(r.bankTransaction.amount) : "",
      r.ledgerEntry?.description?.slice(0, 40) ?? "",
    ]);

  doc.addPage();
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Matched transactions", 40, 40);

  autoTable(doc, {
    startY: 52,
    head: [["Status", "Type", "Conf.", "Bank", "Bank Amt", "Ledger"]],
    body: matchedRows,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129] },
  });

  const unmatched = results.filter(
    (r) => r.status === "unmatched" && (r.bankTransaction || r.ledgerEntry)
  );
  doc.addPage();
  doc.text("Unmatched items", 40, 40);
  autoTable(doc, {
    startY: 52,
    head: [["Side", "Description", "Amount", "Date"]],
    body: unmatched.map((r) => {
      const txn = r.bankTransaction ?? r.ledgerEntry!;
      return [
        r.bankTransaction ? "Bank" : "Ledger",
        txn.description.slice(0, 50),
        formatPKR(txn.amount),
        txn.date,
      ];
    }),
    theme: "striped",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [239, 68, 68] },
  });

  if (options?.auditMeta) {
    appendAuditCertificatePage(
      doc,
      options.auditMeta,
      results,
      options.sessionId
    );
  }

  const wm = options?.watermark ?? "none";
  if (wm === "draft") addWatermark(doc as never, "DRAFT");
  if (wm === "final") addWatermark(doc as never, "FINAL");
  if (wm === "confidential") addWatermark(doc as never, "CONFIDENTIAL");

  const pageCount = doc.getNumberOfPages();
  const hashFooter = options?.auditMeta
    ? formatExportFooterHashes(options.auditMeta)
    : "";
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(`${APP_NAME} · Page ${i} of ${pageCount}`, 40, pageH - 20);
    if (hashFooter) {
      const footerW = doc.internal.pageSize.getWidth() - 80;
      const hashLines = doc.splitTextToSize(hashFooter, footerW) as string[];
      doc.text(hashLines, 40, pageH - 32);
    }
  }

  doc.save(`${APP_REPORT_FILENAME_PREFIX}-${Date.now()}.pdf`);
}
