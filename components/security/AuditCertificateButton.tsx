"use client";

import {
  buildAuditCertificateDocument,
  formatAuditCertificateBlock,
  resolveSessionAuditMeta,
  type SessionAuditMeta,
} from "@/lib/audit-certificate";
import type { BankTransaction, LedgerEntry, MatchResult } from "@/lib/types";
import { logActivity } from "@/lib/activity-log";

interface AuditCertificateButtonProps {
  results: MatchResult[];
  auditMeta?: SessionAuditMeta;
  sessionId?: string | null;
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
}

export function AuditCertificateButton({
  results,
  auditMeta,
  sessionId,
  bankData,
  ledgerData,
}: AuditCertificateButtonProps) {
  async function download() {
    const meta = await resolveSessionAuditMeta({
      ...auditMeta,
      bankData,
      ledgerData,
    });
    const doc = buildAuditCertificateDocument(meta, results, {
      certificateId: sessionId ?? `cert-${Date.now()}`,
      sessionId,
    });
    const text = formatAuditCertificateBlock(doc);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hisaab-audit-certificate-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity("export", "Downloaded audit certificate");
  }

  return (
    <button
      type="button"
      className="btn-ghost px-5 py-2.5 text-sm"
      onClick={() => void download()}
    >
      Audit certificate
    </button>
  );
}
