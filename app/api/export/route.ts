import { NextResponse } from "next/server";
import {
  apiBadRequest,
  apiNotFound,
  apiServerError,
} from "@/lib/api-response";
import { isAuthError, requireTeam } from "@/lib/auth";
import {
  buildAuditCertificateDocument,
  formatAuditCertificateBlock,
  resolveSessionAuditMeta,
  type SessionAuditMeta,
} from "@/lib/audit-certificate";
import { APP_NAME, APP_REPORT_FILENAME_PREFIX } from "@/lib/branding";
import { isDatabaseConfigured } from "@/lib/db";
import { fromDbBankTransaction, fromDbLedgerEntry } from "@/lib/db-mappers";
import { loadSessionPayload, logJournalEntry } from "@/lib/db-helpers";
import {
  evaluateResults,
  formatEvaluationCsvBlock,
} from "@/lib/evaluator";
import {
  categorizeMatchResult,
  isBankCharge,
} from "@/lib/transaction-categories";
import type { BankTransaction, LedgerEntry, MatchResult } from "@/lib/types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function amountDiff(result: MatchResult): string {
  const bank = result.bankTransaction?.amount ?? 0;
  const ledger = result.ledgerEntry?.amount ?? 0;
  if (!result.bankTransaction || !result.ledgerEntry) return "";
  return String(Math.abs(bank - ledger));
}

function buildCsv(results: MatchResult[]): string {
  const headers = [
    "Status",
    "Match_Type",
    "Confidence",
    "Posted_At",
    "Bank_Date",
    "Bank_Description",
    "Bank_Amount",
    "Ledger_Date",
    "Ledger_Description",
    "Ledger_Amount",
    "Ledger_Invoice",
    "Amount_Difference",
    "Category",
    "Is_Bank_Charge",
    "Match_Reason",
  ];

  const rows = results.map((r) => {
    const bankDesc = r.bankTransaction?.description ?? "";
    return [
      r.status,
      r.matchType,
      String(r.confidence),
      r.postedAt ?? "",
      r.bankTransaction?.date ?? "",
      bankDesc,
      r.bankTransaction ? String(r.bankTransaction.amount) : "",
      r.ledgerEntry?.date ?? "",
      r.ledgerEntry?.description ?? "",
      r.ledgerEntry ? String(r.ledgerEntry.amount) : "",
      r.ledgerEntry?.invoiceNo ?? "",
      amountDiff(r),
      categorizeMatchResult(r),
      bankDesc && isBankCharge(bankDesc) ? "yes" : "no",
      r.matchReason,
    ];
  });

  return [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(",")),
  ].join("\n");
}

export async function POST(request: Request) {
  const auth = await requireTeam();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const sessionId = body.sessionId as string | undefined;
    let results = body.results as MatchResult[] | undefined;
    let bankData = body.bankData as BankTransaction[] | undefined;
    let ledgerData = body.ledgerData as LedgerEntry[] | undefined;
    const auditInput = body.audit as Partial<SessionAuditMeta> | undefined;

    let dbSession: Awaited<ReturnType<typeof loadSessionPayload>> | null = null;

    if (sessionId && isDatabaseConfigured()) {
      dbSession = await loadSessionPayload(sessionId);
      if (!dbSession) {
        return apiNotFound(`Session not found for id "${sessionId}".`);
      }
      results = dbSession.results;
      bankData = dbSession.session.bankTransactions.map(fromDbBankTransaction);
      ledgerData = dbSession.session.ledgerEntries.map(fromDbLedgerEntry);

      await logJournalEntry({
        sessionId,
        action: "REPORT_EXPORTED",
        description: `Exported ${APP_NAME} report (${results.length} rows) with audit certificate`,
      });
    }

    if (!results?.length) {
      return apiBadRequest(
        "results array or a valid sessionId with saved matches is required."
      );
    }

    const auditMeta = await resolveSessionAuditMeta({
      bankFileName:
        auditInput?.bankFileName ??
        dbSession?.session.bankFileName ??
        "bank_statement.csv",
      ledgerFileName:
        auditInput?.ledgerFileName ??
        dbSession?.session.ledgerFileName ??
        "ledger.csv",
      bankFileHash: auditInput?.bankFileHash,
      ledgerFileHash: auditInput?.ledgerFileHash,
      bankData,
      ledgerData,
      rulesProcessingTimeMs:
        auditInput?.rulesProcessingTimeMs ??
        dbSession?.session.rulesProcessingTimeMs ??
        0,
      aiProcessingTimeMs:
        auditInput?.aiProcessingTimeMs ??
        dbSession?.session.aiProcessingTimeMs ??
        0,
      reconciledAt:
        auditInput?.reconciledAt ??
        dbSession?.session.createdAt.toISOString(),
    });

    const certificate = buildAuditCertificateDocument(auditMeta, results, {
      certificateId: sessionId ?? `export-${Date.now()}`,
      sessionId,
    });

    const totalProcessingMs =
      (auditMeta.rulesProcessingTimeMs ?? 0) +
      (auditMeta.aiProcessingTimeMs ?? 0);
    const evaluation = evaluateResults(
      results,
      totalProcessingMs,
      auditMeta.aiProcessingTimeMs ?? 0
    );

    const csv =
      buildCsv(results) +
      formatAuditCertificateBlock(certificate) +
      formatEvaluationCsvBlock(evaluation);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${APP_REPORT_FILENAME_PREFIX}.csv"`,
      },
    });
  } catch (error) {
    return apiServerError(error, "POST /api/export");
  }
}
