import type {
  JournalAction,
  MatchStatus as DbMatchStatus,
  MatchType as DbMatchType,
  ProposalStatus as DbProposalStatus,
  SessionStatus,
} from "@prisma/client";
import { prisma } from "./db";
import {
  fromDbMatchResult,
  fromDbProposal,
  parseDateOnly,
  summaryFromSession,
  toDbMatchStatus,
  toDbMatchType,
  toDbProposalStatus,
  toDbTransactionType,
  toProposalSide,
} from "./db-mappers";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
  MissingEntryProposal,
  ReconciliationSummary,
} from "./types";

export { summaryFromSession } from "./db-mappers";

const matchInclude = {
  bankTransaction: true,
  ledgerEntry: true,
} as const;

export async function createSession(data: {
  name?: string;
  bankFileName: string;
  bankRowCount: number;
  ledgerFileName: string;
  ledgerRowCount: number;
}) {
  return prisma.reconciliationSession.create({
    data: {
      name: data.name,
      bankFileName: data.bankFileName,
      bankRowCount: data.bankRowCount,
      ledgerFileName: data.ledgerFileName,
      ledgerRowCount: data.ledgerRowCount,
      status: "PROCESSING",
    },
  });
}

export async function getSession(id: string) {
  return prisma.reconciliationSession.findUnique({
    where: { id },
    include: {
      bankTransactions: { orderBy: { rowIndex: "asc" } },
      ledgerEntries: { orderBy: { rowIndex: "asc" } },
      matchResults: { include: matchInclude, orderBy: { createdAt: "asc" } },
      journalPosts: { orderBy: { createdAt: "desc" } },
      missingProposals: {
        include: { bankTransaction: true, ledgerEntry: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function listSessions(limit = 20) {
  return prisma.reconciliationSession.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function updateSessionSummary(
  sessionId: string,
  summary: ReconciliationSummary,
  extras?: {
    aiScoringUsed?: boolean;
    aiPairsScored?: number;
    aiProcessingTimeMs?: number;
    rulesProcessingTimeMs?: number;
    status?: SessionStatus;
  }
) {
  await prisma.reconciliationSession.update({
    where: { id: sessionId },
    data: {
      totalAutoMatched: summary.autoMatched,
      totalNeedsReview: summary.needsReview,
      totalUnmatched: summary.unmatched,
      totalPosted: summary.posted,
      totalMatched:
        summary.autoMatched + summary.needsReview + summary.posted,
      matchRate: summary.matchRate,
      totalBankAmount: summary.totalBankAmount,
      totalLedgerAmount: summary.totalLedgerAmount,
      amountDifference: summary.difference,
      aiScoringUsed: extras?.aiScoringUsed,
      aiPairsScored: extras?.aiPairsScored,
      aiProcessingTimeMs: extras?.aiProcessingTimeMs,
      rulesProcessingTimeMs: extras?.rulesProcessingTimeMs,
      status: extras?.status ?? "COMPLETED",
    },
  });
}

export async function saveBankTransactions(
  sessionId: string,
  txns: BankTransaction[]
): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();

  await prisma.bankTransaction.createMany({
    data: txns.map((t, index) => ({
      sessionId,
      date: parseDateOnly(t.date),
      description: t.description,
      normalizedDescription: t.normalizedDescription,
      debit: t.debit,
      credit: t.credit,
      amount: t.amount,
      type: toDbTransactionType(t.type),
      balance: t.balance,
      reference: t.reference || null,
      rowIndex: index,
    })),
  });

  const saved = await prisma.bankTransaction.findMany({
    where: { sessionId },
    orderBy: { rowIndex: "asc" },
  });

  txns.forEach((t, index) => {
    if (saved[index]) idMap.set(t.id, saved[index].id);
  });

  return idMap;
}

export async function saveLedgerEntries(
  sessionId: string,
  entries: LedgerEntry[]
): Promise<Map<string, string>> {
  const idMap = new Map<string, string>();

  await prisma.ledgerEntry.createMany({
    data: entries.map((e, index) => ({
      sessionId,
      date: parseDateOnly(e.date),
      description: e.description,
      normalizedDescription: e.normalizedDescription,
      amount: e.amount,
      type: toDbTransactionType(e.type),
      reference: e.reference || null,
      invoiceNo: e.invoiceNo || null,
      rowIndex: index,
    })),
  });

  const saved = await prisma.ledgerEntry.findMany({
    where: { sessionId },
    orderBy: { rowIndex: "asc" },
  });

  entries.forEach((e, index) => {
    if (saved[index]) idMap.set(e.id, saved[index].id);
  });

  return idMap;
}

export async function saveMatchResults(
  sessionId: string,
  results: MatchResult[],
  bankIdMap: Map<string, string>,
  ledgerIdMap: Map<string, string>
): Promise<MatchResult[]> {
  if (results.length === 0) return [];

  const matchedBankIds = new Set<string>();
  const unmatchedBankIds = new Set<string>();
  const matchedLedgerIds = new Set<string>();
  const unmatchedLedgerIds = new Set<string>();

  const createRows = results.map((r) => {
    const bankDbId = r.bankTransaction
      ? bankIdMap.get(r.bankTransaction.id) ?? null
      : null;
    const ledgerDbId = r.ledgerEntry
      ? ledgerIdMap.get(r.ledgerEntry.id) ?? null
      : null;
    const isMatched = r.status !== "unmatched";

    if (bankDbId) {
      if (isMatched) matchedBankIds.add(bankDbId);
      else unmatchedBankIds.add(bankDbId);
    }
    if (ledgerDbId) {
      if (isMatched) matchedLedgerIds.add(ledgerDbId);
      else unmatchedLedgerIds.add(ledgerDbId);
    }

    const aiReasoning = r.matchReason.startsWith("AI:") ? r.matchReason : null;

    return {
      sessionId,
      bankTxnId: bankDbId,
      ledgerEntryId: ledgerDbId,
      confidence: r.confidence,
      status: toDbMatchStatus(r.status),
      matchType: toDbMatchType(r.matchType),
      matchReason: r.matchReason,
      bankAmount: r.bankTransaction?.amount ?? null,
      ledgerAmount: r.ledgerEntry?.amount ?? null,
      amountDiff:
        r.bankTransaction && r.ledgerEntry
          ? r.bankTransaction.amount - r.ledgerEntry.amount
          : null,
      aiScored: !!aiReasoning,
      aiConfidence: aiReasoning ? r.confidence : null,
      aiReasoning: aiReasoning ?? null,
      aiScoredAt: aiReasoning ? new Date() : null,
    };
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.matchResult.createMany({ data: createRows });

      if (matchedBankIds.size > 0) {
        await tx.bankTransaction.updateMany({
          where: { id: { in: [...matchedBankIds] } },
          data: { isMatched: true },
        });
      }
      if (unmatchedBankIds.size > 0) {
        await tx.bankTransaction.updateMany({
          where: { id: { in: [...unmatchedBankIds] } },
          data: { isMatched: false },
        });
      }
      if (matchedLedgerIds.size > 0) {
        await tx.ledgerEntry.updateMany({
          where: { id: { in: [...matchedLedgerIds] } },
          data: { isMatched: true },
        });
      }
      if (unmatchedLedgerIds.size > 0) {
        await tx.ledgerEntry.updateMany({
          where: { id: { in: [...unmatchedLedgerIds] } },
          data: { isMatched: false },
        });
      }
    },
    { maxWait: 15_000, timeout: 30_000 }
  );

  const saved = await prisma.matchResult.findMany({
    where: { sessionId },
    include: matchInclude,
    orderBy: { createdAt: "asc" },
  });

  const rowKey = (bankTxnId: string | null, ledgerEntryId: string | null) =>
    `${bankTxnId ?? ""}:${ledgerEntryId ?? ""}`;

  const savedByKey = new Map(
    saved.map((row) => [rowKey(row.bankTxnId, row.ledgerEntryId), row])
  );

  return results.map((r) => {
    const bankDbId = r.bankTransaction
      ? bankIdMap.get(r.bankTransaction.id) ?? null
      : null;
    const ledgerDbId = r.ledgerEntry
      ? ledgerIdMap.get(r.ledgerEntry.id) ?? null
      : null;
    const row = savedByKey.get(rowKey(bankDbId, ledgerDbId));
    if (row) return fromDbMatchResult(row);
    return r;
  });
}

export async function getMatchResults(
  sessionId: string,
  filters?: {
    status?: DbMatchStatus;
    matchType?: DbMatchType;
    minConfidence?: number;
  }
): Promise<MatchResult[]> {
  const rows = await prisma.matchResult.findMany({
    where: {
      sessionId,
      status: filters?.status,
      matchType: filters?.matchType,
      confidence: filters?.minConfidence
        ? { gte: filters.minConfidence }
        : undefined,
    },
    include: matchInclude,
    orderBy: { createdAt: "asc" },
  });

  return rows.map(fromDbMatchResult);
}

export async function updateMatchStatus(
  matchId: string,
  status: DbMatchStatus,
  reviewedBy?: string,
  reviewNote?: string
) {
  const updated = await prisma.matchResult.update({
    where: { id: matchId },
    data: {
      status,
      reviewedBy,
      reviewNote,
      reviewedAt: reviewedBy ? new Date() : undefined,
    },
    include: matchInclude,
  });

  return fromDbMatchResult(updated);
}

export async function logJournalEntry(data: {
  sessionId: string;
  action: JournalAction;
  description: string;
  matchResultId?: string;
  proposalId?: string;
  performedBy?: string;
  bankAmount?: number;
  ledgerAmount?: number;
}) {
  return prisma.journalPost.create({
    data: {
      sessionId: data.sessionId,
      action: data.action,
      description: data.description,
      matchResultId: data.matchResultId,
      proposalId: data.proposalId,
      performedBy: data.performedBy ?? "system",
      bankAmount: data.bankAmount,
      ledgerAmount: data.ledgerAmount,
    },
  });
}

export async function getJournalEntries(sessionId: string) {
  return prisma.journalPost.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });
}

export async function saveProposals(
  sessionId: string,
  proposals: MissingEntryProposal[],
  bankIdMap: Map<string, string>,
  ledgerIdMap: Map<string, string>
) {
  if (proposals.length === 0) return;

  await prisma.missingEntryProposal.createMany({
    data: proposals.map((p) => {
      if (p.source === "bank_only") {
        const ledger = p.proposedLedgerEntry;
        return {
          sessionId,
          sourceSide: toProposalSide(p.source),
          bankTxnId: bankIdMap.get(p.bankTransaction.id) ?? null,
          proposedDate: parseDateOnly(ledger.date),
          proposedDescription: ledger.description,
          proposedAmount: ledger.amount,
          proposedType: toDbTransactionType(ledger.type),
          proposedReference: ledger.reference || null,
          proposedInvoiceNo: ledger.invoiceNo || null,
          status: toDbProposalStatus(p.status),
        };
      }

      const bank = p.proposedBankTransaction;
      return {
        sessionId,
        sourceSide: toProposalSide(p.source),
        ledgerEntryId: ledgerIdMap.get(p.ledgerEntry.id) ?? null,
        proposedDate: parseDateOnly(bank.date),
        proposedDescription: bank.description,
        proposedAmount: bank.amount,
        proposedType: toDbTransactionType(bank.type),
        proposedReference: bank.reference || null,
        proposedInvoiceNo: null,
        status: toDbProposalStatus(p.status),
      };
    }),
  });
}

export async function getProposals(sessionId: string) {
  const rows = await prisma.missingEntryProposal.findMany({
    where: { sessionId },
    include: { bankTransaction: true, ledgerEntry: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(fromDbProposal);
}

export async function updateProposalStatus(
  proposalId: string,
  status: DbProposalStatus,
  reviewedBy?: string
) {
  return prisma.missingEntryProposal.update({
    where: { id: proposalId },
    data: {
      status,
      reviewedBy,
      reviewedAt: reviewedBy ? new Date() : undefined,
      postedAt: status === "POSTED" ? new Date() : undefined,
    },
  });
}

export async function loadSessionPayload(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return null;

  const results = session.matchResults.map(fromDbMatchResult);
  const summary = summaryFromSession(session);
  const proposals = session.missingProposals.map(fromDbProposal);

  return {
    session,
    results,
    summary,
    proposals,
    journalPosts: session.journalPosts,
  };
}
