import type {
  BankTransaction,
  JournalPost,
  LedgerEntry,
  MatchResult,
  MissingEntryProposal,
} from "./types";

let proposalSeq = 0;

function nextProposalId(): string {
  proposalSeq += 1;
  return `prop-${proposalSeq}`;
}

/** Build a ledger line from an unmatched bank transaction. */
function ledgerFromBank(bank: BankTransaction): LedgerEntry {
  return {
    id: `gen-ledger-${bank.id}`,
    date: bank.date,
    description: `[Generated] ${bank.description}`,
    normalizedDescription: bank.normalizedDescription,
    amount: bank.amount,
    type: bank.type,
    reference: bank.reference ? `${bank.reference}-GEN` : `GEN-${bank.id}`,
    invoiceNo: `AUTO-${bank.date.replace(/-/g, "")}-${bank.id}`,
  };
}

/** Build a bank line from an unmatched ledger entry. */
function bankFromLedger(ledger: LedgerEntry): BankTransaction {
  return {
    id: `gen-bank-${ledger.id}`,
    date: ledger.date,
    description: `[Generated] ${ledger.description}`,
    normalizedDescription: ledger.normalizedDescription,
    debit: ledger.type === "debit" ? ledger.amount : null,
    credit: ledger.type === "credit" ? ledger.amount : null,
    amount: ledger.amount,
    type: ledger.type,
    balance: null,
    reference: ledger.reference ? `${ledger.reference}-GEN` : `GEN-${ledger.id}`,
  };
}

export function generateMissingEntries(
  results: MatchResult[]
): MissingEntryProposal[] {
  proposalSeq = 0;
  const proposals: MissingEntryProposal[] = [];

  for (const match of results) {
    if (match.status !== "unmatched") continue;

    if (match.bankTransaction && !match.ledgerEntry) {
      const bank = match.bankTransaction;
      proposals.push({
        id: nextProposalId(),
        matchId: match.id,
        source: "bank_only",
        bankTransaction: bank,
        proposedLedgerEntry: ledgerFromBank(bank),
        narration: `Post ${bank.type} PKR ${bank.amount} to clear bank-only item`,
        reason:
          "No ledger entry found — generate adjusting entry to balance the books",
        status: "draft",
      });
    }

    if (match.ledgerEntry && !match.bankTransaction) {
      const ledger = match.ledgerEntry;
      proposals.push({
        id: nextProposalId(),
        matchId: match.id,
        source: "ledger_only",
        ledgerEntry: ledger,
        proposedBankTransaction: bankFromLedger(ledger),
        narration: `Record bank clearance for ledger ${ledger.type} PKR ${ledger.amount}`,
        reason:
          "No bank transaction found — generate bank line for unreconciled ledger entry",
        status: "draft",
      });
    }
  }

  return proposals;
}

export function getPostableMatches(results: MatchResult[]): MatchResult[] {
  return results.filter(
    (r) =>
      (r.status === "auto_matched" || r.status === "approved") &&
      r.bankTransaction &&
      r.ledgerEntry
  );
}

export function createJournalPosts(matches: MatchResult[]): JournalPost[] {
  const now = new Date().toISOString();
  return matches.map((m) => {
    const bank = m.bankTransaction!;
    const ledger = m.ledgerEntry!;
    return {
      id: `post-${m.id}-${Date.now()}`,
      matchId: m.id,
      postedAt: now,
      amount: bank.amount,
      type: bank.type,
      narration: `Posted: ${bank.description} ↔ ${ledger.description}`,
      bankReference: bank.reference,
      ledgerReference: ledger.reference,
      invoiceNo: ledger.invoiceNo,
    };
  });
}

function applyProposalToMatch(
  match: MatchResult,
  proposal: MissingEntryProposal
): MatchResult {
  const postedAt = new Date().toISOString();

  if (proposal.source === "bank_only") {
    return {
      ...match,
      ledgerEntry: proposal.proposedLedgerEntry,
      bankTransaction: proposal.bankTransaction,
      status: "posted",
      matchType: "generated",
      confidence: 100,
      matchReason: "Posted generated ledger entry for bank-only transaction",
      postedAt,
    };
  }

  return {
    ...match,
    bankTransaction: proposal.proposedBankTransaction,
    ledgerEntry: proposal.ledgerEntry,
    status: "posted",
    matchType: "generated",
    confidence: 100,
    matchReason: "Posted generated bank entry for ledger-only transaction",
    postedAt,
  };
}

export interface PostEntriesInput {
  results: MatchResult[];
  matchIds?: string[];
  proposalIds?: string[];
  proposals?: MissingEntryProposal[];
}

export interface PostEntriesOutput {
  results: MatchResult[];
  journalPosts: JournalPost[];
  proposals: MissingEntryProposal[];
}

export function postEntries(input: PostEntriesInput): PostEntriesOutput {
  const { results, matchIds = [], proposalIds = [], proposals = [] } = input;
  const matchIdSet = new Set(matchIds);
  const proposalIdSet = new Set(proposalIds);
  const journalPosts: JournalPost[] = [];

  const matchesToPost = results.filter((r) => matchIdSet.has(r.id));
  journalPosts.push(...createJournalPosts(matchesToPost));

  const postedMatchIds = new Set(matchesToPost.map((m) => m.id));

  let updatedResults = results.map((r) => {
    if (!postedMatchIds.has(r.id)) return r;
    return {
      ...r,
      status: "posted" as const,
      postedAt: new Date().toISOString(),
      matchReason: r.matchReason.startsWith("Posted")
        ? r.matchReason
        : `Posted: ${r.matchReason}`,
    };
  });

  const updatedProposals = proposals.map((p) => {
    if (!proposalIdSet.has(p.id)) return p;
    const match = updatedResults.find((r) => r.id === p.matchId);
    if (!match) return { ...p, status: "posted" as const, postedAt: new Date().toISOString() };

    const merged = applyProposalToMatch(match, p);
    updatedResults = updatedResults.map((r) =>
      r.id === merged.id ? merged : r
    );

    const bank =
      p.source === "bank_only" ? p.bankTransaction : p.proposedBankTransaction;
    const ledger =
      p.source === "bank_only" ? p.proposedLedgerEntry : p.ledgerEntry;

    journalPosts.push({
      id: `post-${p.id}-${Date.now()}`,
      matchId: p.matchId,
      postedAt: new Date().toISOString(),
      amount: bank.amount,
      type: bank.type,
      narration: p.narration,
      bankReference: bank.reference,
      ledgerReference: ledger.reference,
      invoiceNo: ledger.invoiceNo,
    });

    return { ...p, status: "posted" as const, postedAt: new Date().toISOString() };
  });

  return {
    results: updatedResults,
    journalPosts,
    proposals: updatedProposals,
  };
}
