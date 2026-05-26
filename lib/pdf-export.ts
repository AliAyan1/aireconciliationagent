import { APP_NAME, APP_REPORT_FILENAME_PREFIX, APP_REPORT_TITLE } from "./branding";
import type { MatchResult, ReconciliationSummary } from "./types";
import { formatPKR } from "./format";

export async function downloadReconciliationPdf(
  results: MatchResult[],
  summary: ReconciliationSummary,
  title = APP_REPORT_TITLE
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const generated = new Date().toLocaleString("en-PK");
  const period = new Date().toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });

  doc.setFontSize(18);
  doc.text(`${title} — ${period}`, 40, 40);
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

  const matchedRows = results
    .filter((r) => r.status !== "unmatched" || (r.bankTransaction && r.ledgerEntry))
    .slice(0, 80)
    .map((r) => [
      r.status,
      r.matchType,
      String(r.confidence),
      r.bankTransaction?.description?.slice(0, 40) ?? "",
      r.bankTransaction ? formatPKR(r.bankTransaction.amount) : "",
      r.ledgerEntry?.description?.slice(0, 40) ?? "",
    ]);

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  const startY = (lastTable?.finalY ?? 72) + 24;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Matched & reviewed transactions", 40, startY);

  autoTable(doc, {
    startY: startY + 8,
    head: [
      ["Status", "Type", "Conf.", "Bank", "Bank Amt", "Ledger"],
    ],
    body: matchedRows,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129] },
  });

  const unmatched = results.filter(
    (r) => r.status === "unmatched" && (r.bankTransaction || r.ledgerEntry)
  );
  const last2 = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  const uStart = (last2?.finalY ?? startY) + 24;

  doc.text("Unmatched items", 40, uStart);
  autoTable(doc, {
    startY: uStart + 8,
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

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `${APP_NAME} · Page ${i} of ${pageCount}`,
      40,
      doc.internal.pageSize.getHeight() - 20
    );
  }

  doc.save(`${APP_REPORT_FILENAME_PREFIX}-${Date.now()}.pdf`);
}
