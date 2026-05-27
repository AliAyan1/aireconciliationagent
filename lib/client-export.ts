import { APP_REPORT_FILENAME_PREFIX } from "./branding";
import type { SessionAuditMeta } from "./audit-certificate";
import type { BankTransaction, LedgerEntry, MatchResult } from "./types";

export interface CsvExportPayload {
  results?: MatchResult[];
  sessionId?: string | null;
  audit?: SessionAuditMeta;
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
}

export async function downloadCsvReport(
  payload: MatchResult[] | CsvExportPayload,
  sessionId?: string | null
): Promise<boolean> {
  const body: CsvExportPayload =
    Array.isArray(payload)
      ? { results: payload, sessionId: sessionId ?? undefined }
      : { ...payload, sessionId: payload.sessionId ?? sessionId ?? undefined };

  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return false;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${APP_REPORT_FILENAME_PREFIX}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
