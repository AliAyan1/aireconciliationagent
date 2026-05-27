import XLSX from "xlsx-js-style";
import { APP_REPORT_FILENAME_PREFIX } from "./branding";
import { formatPKR } from "./format";
import type { JournalPost, MatchResult, ReconciliationSummary } from "./types";

const HEADER_FILL = { fgColor: { rgb: "38BDF8" } };
const AUTO_FILL = { fgColor: { rgb: "D1FAE5" } };
const REVIEW_FILL = { fgColor: { rgb: "FEF3C7" } };
const UNMATCHED_FILL = { fgColor: { rgb: "FEE2E2" } };

function styledHeader(row: string[]) {
  return row.map((v) => ({
    v,
    t: "s",
    s: {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: HEADER_FILL,
    },
  }));
}

function matchRow(r: MatchResult) {
  return [
    r.status,
    r.matchType,
    r.confidence,
    r.bankTransaction?.date ?? "",
    r.bankTransaction?.description ?? "",
    r.bankTransaction?.amount ?? "",
    r.ledgerEntry?.date ?? "",
    r.ledgerEntry?.description ?? "",
    r.ledgerEntry?.amount ?? "",
  ];
}

function sheetFromMatches(
  title: string,
  rows: MatchResult[],
  fill: { fgColor: { rgb: string } }
) {
  const header = styledHeader([
    "Status",
    "Type",
    "Confidence",
    "Bank Date",
    "Bank Description",
    "Bank Amount",
    "Ledger Date",
    "Ledger Description",
    "Ledger Amount",
  ]);
  const data = rows.map((r) =>
    matchRow(r).map((cell, i) => ({
      v: cell,
      t: typeof cell === "number" ? "n" : "s",
      s: i === 0 ? { fill } : undefined,
    }))
  );
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 36 },
    { wch: 14 },
    { wch: 12 },
    { wch: 36 },
    { wch: 14 },
  ];
  return { name: title, sheet: ws };
}

export function downloadExcelReport(
  results: MatchResult[],
  summary: ReconciliationSummary,
  journalPosts: JournalPost[]
): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ["Metric", "Value"],
    ["Total bank transactions", summary.totalBankTxns],
    ["Ledger entries", summary.totalLedgerEntries],
    ["Auto matched", summary.autoMatched],
    ["Needs review", summary.needsReview],
    ["Unmatched", summary.unmatched],
    ["Match rate %", summary.matchRate],
    ["Amount difference", formatPKR(summary.difference)],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 28 }, { wch: 20 }];
  if (summaryWs.A1) {
    summaryWs.A1.s = { font: { bold: true }, fill: HEADER_FILL };
    summaryWs.B1.s = { font: { bold: true }, fill: HEADER_FILL };
  }
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  const auto = results.filter(
    (r) => r.status === "auto_matched" || r.status === "posted"
  );
  const reviewed = results.filter(
    (r) => r.status === "approved" || r.status === "rejected"
  );
  const unmatched = results.filter((r) => r.status === "unmatched");

  for (const { name, sheet } of [
    sheetFromMatches("Auto Matched", auto, AUTO_FILL),
    sheetFromMatches("Reviewed", reviewed, REVIEW_FILL),
    sheetFromMatches("Unmatched", unmatched, UNMATCHED_FILL),
  ]) {
    XLSX.utils.book_append_sheet(wb, sheet, name);
  }

  const journalHeader = styledHeader([
    "Timestamp",
    "Amount",
    "Type",
    "Narration",
    "Bank Ref",
    "Ledger Ref",
  ]);
  const journalRows = journalPosts.map((j) => [
    j.postedAt,
    j.amount,
    j.type,
    j.narration,
    j.bankReference,
    j.ledgerReference,
  ]);
  const journalWs = XLSX.utils.aoa_to_sheet([journalHeader, ...journalRows]);
  XLSX.utils.book_append_sheet(wb, journalWs, "Journal Log");

  XLSX.writeFile(wb, `${APP_REPORT_FILENAME_PREFIX}.xlsx`);
}
