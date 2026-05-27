import { APP_REPORT_FILENAME_PREFIX } from "./branding";
import type { JournalPost } from "./types";

function escapeCsv(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export interface AuditJournalRow {
  timestamp: string;
  action: string;
  description: string;
  amount: string;
  performedBy: string;
}

export function buildJournalCsv(rows: AuditJournalRow[]): string {
  const headers = ["Timestamp", "Action", "Description", "Amount", "Performed By"];
  const body = rows.map((r) =>
    [r.timestamp, r.action, r.description, r.amount, r.performedBy]
      .map((c) => escapeCsv(c))
      .join(",")
  );
  return [headers.join(","), ...body].join("\n");
}

export function journalPostsToAuditRows(posts: JournalPost[]): AuditJournalRow[] {
  return posts.map((p) => ({
    timestamp: p.postedAt,
    action: "ENTRY_POSTED",
    description: p.narration,
    amount: String(p.amount),
    performedBy: "team",
  }));
}

export function downloadJournalCsv(rows: AuditJournalRow[]) {
  const csv = buildJournalCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${APP_REPORT_FILENAME_PREFIX}-journal-log.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
