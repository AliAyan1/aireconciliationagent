import type {
  JournalAction,
  MatchStatus as DbMatchStatus,
  MatchType as DbMatchType,
  ProposalSide,
  ProposalStatus as DbProposalStatus,
  TransactionType,
} from "@prisma/client";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
  MatchStatus,
  MatchType,
  MissingEntryProposal,
  ReconciliationSummary,
} from "./types";

export function toDbTransactionType(type: "debit" | "credit"): TransactionType {
  return type === "credit" ? "CREDIT" : "DEBIT";
}

export function fromDbTransactionType(
  type: TransactionType
): "debit" | "credit" {
  return type === "CREDIT" ? "credit" : "debit";
}

export function toDbMatchStatus(status: MatchStatus): DbMatchStatus {
  const map: Record<MatchStatus, DbMatchStatus> = {
    auto_matched: "AUTO_MATCHED",
    review: "REVIEW",
    approved: "APPROVED",
    rejected: "REJECTED",
    unmatched: "UNMATCHED",
    posted: "POSTED",
  };
  return map[status];
}

export function fromDbMatchStatus(status: DbMatchStatus): MatchStatus {
  const map: Record<DbMatchStatus, MatchStatus> = {
    AUTO_MATCHED: "auto_matched",
    REVIEW: "review",
    APPROVED: "approved",
    REJECTED: "rejected",
    UNMATCHED: "unmatched",
    POSTED: "posted",
  };
  return map[status];
}

export function toDbMatchType(type: MatchType): DbMatchType {
  const map: Record<MatchType, DbMatchType> = {
    exact: "EXACT",
    near: "NEAR",
    fuzzy: "FUZZY",
    ai_scored: "AI_SCORED",
    unmatched: "UNMATCHED",
    generated: "GENERATED",
    manual: "EXACT", // manual matches stored as EXACT in DB
  };
  return map[type];
}

export function fromDbMatchType(type: DbMatchType): MatchType {
  const map: Record<DbMatchType, MatchType> = {
    EXACT: "exact",
    NEAR: "near",
    FUZZY: "fuzzy",
    AI_SCORED: "ai_scored",
    GENERATED: "generated",
    UNMATCHED: "unmatched",
  };
  return map[type];
}

export function toDbProposalStatus(
  status: "draft" | "posted"
): DbProposalStatus {
  return status === "posted" ? "POSTED" : "PENDING";
}

export function fromDbProposalStatus(
  status: DbProposalStatus
): "draft" | "posted" {
  if (status === "POSTED") return "posted";
  return "draft";
}

export function toProposalSide(source: "bank_only" | "ledger_only"): ProposalSide {
  return source === "bank_only" ? "BANK" : "LEDGER";
}

export function parseDateOnly(dateStr: string): Date {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromDbBankTransaction(
  row: {
    id: string;
    date: Date;
    description: string;
    normalizedDescription: string;
    debit: number | null;
    credit: number | null;
    amount: number;
    type: TransactionType;
    balance: number | null;
    reference: string | null;
  }
): BankTransaction {
  return {
    id: row.id,
    date: formatDateOnly(row.date),
    description: row.description,
    normalizedDescription: row.normalizedDescription,
    debit: row.debit,
    credit: row.credit,
    amount: row.amount,
    type: fromDbTransactionType(row.type),
    balance: row.balance,
    reference: row.reference ?? "",
  };
}

export function fromDbLedgerEntry(
  row: {
    id: string;
    date: Date;
    description: string;
    normalizedDescription: string;
    amount: number;
    type: TransactionType;
    reference: string | null;
    invoiceNo: string | null;
  }
): LedgerEntry {
  return {
    id: row.id,
    date: formatDateOnly(row.date),
    description: row.description,
    normalizedDescription: row.normalizedDescription,
    amount: row.amount,
    type: fromDbTransactionType(row.type),
    reference: row.reference ?? "",
    invoiceNo: row.invoiceNo ?? "",
  };
}

export function fromDbMatchResult(row: {
  id: string;
  confidence: number;
  status: DbMatchStatus;
  matchType: DbMatchType;
  matchReason: string;
  postedAt: Date | null;
  aiScored?: boolean;
  aiConfidence?: number | null;
  aiReasoning?: string | null;
  aiScoredAt?: Date | null;
  bankTransaction: Parameters<typeof fromDbBankTransaction>[0] | null;
  ledgerEntry: Parameters<typeof fromDbLedgerEntry>[0] | null;
}): MatchResult {
  const matchType = fromDbMatchType(row.matchType);
  const aiFromDb =
    row.aiScored ||
    matchType === "ai_scored" ||
    row.matchReason.startsWith("AI:");

  let aiMetadata: MatchResult["aiMetadata"];
  if (aiFromDb) {
    aiMetadata = {
      aiScored: row.aiScored ?? matchType === "ai_scored",
      aiConfidence: row.aiConfidence ?? null,
      aiReasoning:
        row.aiReasoning ??
        (row.matchReason.startsWith("AI:")
          ? row.matchReason.replace(/^AI:\s*/, "")
          : null),
      scoredAt: row.aiScoredAt?.toISOString() ?? null,
    };
  }

  return {
    id: row.id,
    bankTransaction: row.bankTransaction
      ? fromDbBankTransaction(row.bankTransaction)
      : null,
    ledgerEntry: row.ledgerEntry ? fromDbLedgerEntry(row.ledgerEntry) : null,
    confidence: row.confidence,
    status: fromDbMatchStatus(row.status),
    matchType,
    matchReason: row.matchReason,
    postedAt: row.postedAt?.toISOString(),
    aiMetadata,
  };
}

export function fromDbProposal(row: {
  id: string;
  sourceSide: ProposalSide;
  status: DbProposalStatus;
  postedAt: Date | null;
  proposedDate: Date;
  proposedDescription: string;
  proposedAmount: number;
  proposedType: TransactionType;
  proposedReference: string | null;
  proposedInvoiceNo: string | null;
  bankTransaction: Parameters<typeof fromDbBankTransaction>[0] | null;
  ledgerEntry: Parameters<typeof fromDbLedgerEntry>[0] | null;
}): MissingEntryProposal {
  const proposedLedger: LedgerEntry = {
    id: `prop-ledger-${row.id}`,
    date: formatDateOnly(row.proposedDate),
    description: row.proposedDescription,
    normalizedDescription: row.proposedDescription.toUpperCase(),
    amount: row.proposedAmount,
    type: fromDbTransactionType(row.proposedType),
    reference: row.proposedReference ?? "",
    invoiceNo: row.proposedInvoiceNo ?? "",
  };

  const proposedBank: BankTransaction = {
    id: `prop-bank-${row.id}`,
    date: formatDateOnly(row.proposedDate),
    description: row.proposedDescription,
    normalizedDescription: row.proposedDescription.toUpperCase(),
    debit:
      row.proposedType === "DEBIT" ? row.proposedAmount : null,
    credit:
      row.proposedType === "CREDIT" ? row.proposedAmount : null,
    amount: row.proposedAmount,
    type: fromDbTransactionType(row.proposedType),
    balance: null,
    reference: row.proposedReference ?? "",
  };

  const status = fromDbProposalStatus(row.status);

  if (row.sourceSide === "BANK" && row.bankTransaction) {
    return {
      id: row.id,
      matchId: row.id,
      source: "bank_only",
      bankTransaction: fromDbBankTransaction(row.bankTransaction),
      proposedLedgerEntry: proposedLedger,
      narration: row.proposedDescription,
      reason: "Generated missing ledger entry",
      status,
      postedAt: row.postedAt?.toISOString(),
    };
  }

  return {
    id: row.id,
    matchId: row.id,
    source: "ledger_only",
    ledgerEntry: row.ledgerEntry
      ? fromDbLedgerEntry(row.ledgerEntry)
      : proposedLedger,
    proposedBankTransaction: proposedBank,
    narration: row.proposedDescription,
    reason: "Generated missing bank entry",
    status,
    postedAt: row.postedAt?.toISOString(),
  };
}

export function summaryFromSession(session: {
  bankRowCount: number;
  ledgerRowCount: number;
  totalAutoMatched: number;
  totalNeedsReview: number;
  totalUnmatched: number;
  totalPosted: number;
  matchRate: number;
  totalBankAmount: number;
  totalLedgerAmount: number;
  amountDifference: number;
}): ReconciliationSummary {
  return {
    totalBankTxns: session.bankRowCount,
    totalLedgerEntries: session.ledgerRowCount,
    autoMatched: session.totalAutoMatched,
    needsReview: session.totalNeedsReview,
    unmatched: session.totalUnmatched,
    posted: session.totalPosted,
    pendingMissing: session.totalUnmatched,
    matchRate: session.matchRate,
    totalBankAmount: session.totalBankAmount,
    totalLedgerAmount: session.totalLedgerAmount,
    difference: session.amountDifference,
  };
}

export type { JournalAction };
