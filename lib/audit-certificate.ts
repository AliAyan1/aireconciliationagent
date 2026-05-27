import { APP_NAME } from "./branding";
import type { BankTransaction, LedgerEntry, MatchResult } from "./types";

/** Brand line on the audit certificate (product sign-off). */
export const AUDIT_CERTIFICATE_SIGNER = "Hisaab.ai";

export interface SessionAuditMeta {
  bankFileName: string;
  ledgerFileName: string;
  bankFileHash: string;
  ledgerFileHash: string;
  rulesProcessingTimeMs: number;
  aiProcessingTimeMs: number;
  /** When matching completed (ISO 8601). */
  reconciledAt: string;
}

export interface AuditCertificateStats {
  autoApproved: number;
  manuallyReviewed: number;
  unmatched: number;
}

export interface AuditCertificateDocument {
  signer: string;
  reconciliationDate: string;
  files: { name: string; hash: string }[];
  stats: AuditCertificateStats;
  processingTimeSeconds: number;
  signedAt: string;
  certificateId: string;
  sessionId?: string | null;
}

export function computeAuditStats(results: MatchResult[]): AuditCertificateStats {
  let autoApproved = 0;
  let manuallyReviewed = 0;
  let unmatched = 0;

  for (const r of results) {
    if (r.status === "auto_matched" || r.status === "posted") {
      autoApproved++;
    } else if (r.status === "approved" || r.status === "rejected") {
      manuallyReviewed++;
    } else if (r.status === "unmatched") {
      unmatched++;
    }
  }

  return { autoApproved, manuallyReviewed, unmatched };
}

export function formatProcessingTimeSeconds(
  rulesMs: number,
  aiMs: number
): number {
  const totalMs = Math.max(0, rulesMs) + Math.max(0, aiMs);
  return Math.round((totalMs / 1000) * 10) / 10;
}

export function formatCertificateDate(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function shortenHash(hash: string, visible = 16): string {
  const normalized = hash.replace(/^sha-256:/i, "").trim();
  if (normalized.length <= visible) return normalized;
  return `${normalized.slice(0, visible)}…`;
}

/** Compact integrity label, e.g. `a3f2...b891`. */
export function formatIntegrityFingerprint(hash: string): string {
  const h = hash.replace(/^sha-256:/i, "").trim();
  if (h.length < 12) return h || "—";
  return `${h.slice(0, 4)}...${h.slice(-4)}`;
}

export function formatFileIntegrityLine(
  label: string,
  hash: string
): string {
  return `${label} integrity: ${formatIntegrityFingerprint(hash)}`;
}

export function formatExportFooterHashes(meta: SessionAuditMeta): string {
  return [
    formatFileIntegrityLine(meta.bankFileName, meta.bankFileHash),
    formatFileIntegrityLine(meta.ledgerFileName, meta.ledgerFileHash),
  ].join(" · ");
}

export async function hashTextSha256(text: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle !== "undefined") {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "hex"))
      .join("");
  }

  const { createHash } = await import("crypto");
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export async function hashCanonicalTransactions(
  bankData: BankTransaction[],
  ledgerData: LedgerEntry[]
): Promise<{ bankFileHash: string; ledgerFileHash: string }> {
  const bankPayload = JSON.stringify(
    bankData.map((t) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      description: t.description,
      reference: t.reference,
    }))
  );
  const ledgerPayload = JSON.stringify(
    ledgerData.map((t) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      description: t.description,
      invoiceNo: t.invoiceNo,
    }))
  );
  const [bankFileHash, ledgerFileHash] = await Promise.all([
    hashTextSha256(bankPayload),
    hashTextSha256(ledgerPayload),
  ]);
  return { bankFileHash, ledgerFileHash };
}

export function buildAuditCertificateDocument(
  meta: SessionAuditMeta,
  results: MatchResult[],
  options?: {
    certificateId?: string;
    signedAt?: string;
    sessionId?: string | null;
  }
): AuditCertificateDocument {
  const stats = computeAuditStats(results);
  const signedAt = options?.signedAt ?? new Date().toISOString();

  return {
    signer: AUDIT_CERTIFICATE_SIGNER,
    reconciliationDate: formatCertificateDate(meta.reconciledAt),
    files: [
      { name: meta.bankFileName, hash: meta.bankFileHash },
      { name: meta.ledgerFileName, hash: meta.ledgerFileHash },
    ],
    stats,
    processingTimeSeconds: formatProcessingTimeSeconds(
      meta.rulesProcessingTimeMs,
      meta.aiProcessingTimeMs
    ),
    signedAt,
    certificateId: options?.certificateId ?? APP_NAME,
    sessionId: options?.sessionId ?? null,
  };
}

export function formatAuditCertificateParagraph(doc: AuditCertificateDocument): string {
  const fileLines = doc.files
    .map(
      (f) =>
        `${f.name} (hash: ${shortenHash(f.hash)})`
    )
    .join(", ");

  const statsPart = [
    `${doc.stats.autoApproved} match${doc.stats.autoApproved === 1 ? "" : "es"} auto-approved`,
    `${doc.stats.manuallyReviewed} manually reviewed`,
    `${doc.stats.unmatched} unmatched`,
  ].join(", ");

  const timeLabel =
    doc.processingTimeSeconds === 1
      ? "1 second"
      : `${doc.processingTimeSeconds} seconds`;

  const sessionPart = doc.sessionId
    ? ` Signed digitally with session ID ${doc.sessionId}.`
    : "";

  return (
    `This reconciliation was performed by ${doc.signer} on ${doc.reconciliationDate}. ` +
    `Files processed: ${fileLines}. ` +
    `${statsPart}. ` +
    `Total processing time: ${timeLabel}.${sessionPart}`
  );
}

export function formatAuditCertificateBlock(
  doc: AuditCertificateDocument
): string {
  const signedLocal = new Date(doc.signedAt).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return [
    "",
    "========== AUDIT CERTIFICATE ==========",
    "",
    formatAuditCertificateParagraph(doc),
    "",
    `Signed: ${signedLocal}`,
    `Timestamp (UTC): ${doc.signedAt}`,
    `Certificate: ${doc.certificateId}`,
    doc.sessionId ? `Session ID: ${doc.sessionId}` : "",
    "",
    "=======================================",
    "",
  ].join("\n");
}

export async function resolveSessionAuditMeta(
  partial: Partial<SessionAuditMeta> & {
    bankData?: BankTransaction[];
    ledgerData?: LedgerEntry[];
  }
): Promise<SessionAuditMeta> {
  const bankFileName = partial.bankFileName ?? "bank_statement.csv";
  const ledgerFileName = partial.ledgerFileName ?? "ledger.csv";
  let bankFileHash = partial.bankFileHash ?? "";
  let ledgerFileHash = partial.ledgerFileHash ?? "";

  if (
    (!bankFileHash || !ledgerFileHash) &&
    partial.bankData?.length &&
    partial.ledgerData?.length
  ) {
    const hashes = await hashCanonicalTransactions(
      partial.bankData,
      partial.ledgerData
    );
    bankFileHash = bankFileHash || hashes.bankFileHash;
    ledgerFileHash = ledgerFileHash || hashes.ledgerFileHash;
  }

  if (!bankFileHash) bankFileHash = await hashTextSha256("");
  if (!ledgerFileHash) ledgerFileHash = await hashTextSha256("");

  return {
    bankFileName,
    ledgerFileName,
    bankFileHash,
    ledgerFileHash,
    rulesProcessingTimeMs: partial.rulesProcessingTimeMs ?? 0,
    aiProcessingTimeMs: partial.aiProcessingTimeMs ?? 0,
    reconciledAt: partial.reconciledAt ?? new Date().toISOString(),
  };
}
