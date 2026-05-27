export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  normalizedDescription: string;
  debit: number | null;
  credit: number | null;
  amount: number;
  type: "debit" | "credit";
  balance: number | null;
  reference: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  normalizedDescription: string;
  amount: number;
  type: "debit" | "credit";
  reference: string;
  invoiceNo: string;
}

export type MatchStatus =
  | "auto_matched"
  | "review"
  | "approved"
  | "rejected"
  | "unmatched"
  | "posted";

export type MatchType =
  | "exact"
  | "near"
  | "fuzzy"
  | "ai_scored"
  | "generated"
  | "unmatched"
  | "manual";

export interface AIScoreMetadata {
  aiScored: boolean;
  aiConfidence: number | null;
  aiReasoning: string | null;
  matchFactors?: {
    entityMatch: "high" | "medium" | "low" | "none";
    amountMatch: "high" | "medium" | "low" | "none";
    dateMatch: "high" | "medium" | "low" | "none";
    referenceMatch: "high" | "medium" | "low" | "none";
    contextMatch: "high" | "medium" | "low" | "none";
  } | null;
  scoredAt: string | null;
}

export interface MatchResult {
  id: string;
  bankTransaction: BankTransaction | null;
  ledgerEntry: LedgerEntry | null;
  confidence: number;
  status: MatchStatus;
  matchType: MatchType;
  matchReason: string;
  postedAt?: string;
  aiMetadata?: AIScoreMetadata;
}

export interface ReconciliationSummary {
  totalBankTxns: number;
  totalLedgerEntries: number;
  autoMatched: number;
  needsReview: number;
  unmatched: number;
  posted: number;
  pendingMissing: number;
  matchRate: number;
  totalBankAmount: number;
  totalLedgerAmount: number;
  difference: number;
}

export type MissingEntrySource = "bank_only" | "ledger_only";

export type ProposalStatus = "draft" | "posted";

export interface BankMissingProposal {
  id: string;
  matchId: string;
  source: "bank_only";
  bankTransaction: BankTransaction;
  proposedLedgerEntry: LedgerEntry;
  narration: string;
  reason: string;
  status: ProposalStatus;
  postedAt?: string;
}

export interface LedgerMissingProposal {
  id: string;
  matchId: string;
  source: "ledger_only";
  ledgerEntry: LedgerEntry;
  proposedBankTransaction: BankTransaction;
  narration: string;
  reason: string;
  status: ProposalStatus;
  postedAt?: string;
}

export type MissingEntryProposal = BankMissingProposal | LedgerMissingProposal;

export interface JournalPost {
  id: string;
  matchId: string;
  postedAt: string;
  amount: number;
  type: "debit" | "credit";
  narration: string;
  bankReference: string;
  ledgerReference: string;
  invoiceNo: string;
}

export interface UploadState {
  bankFile: File | null;
  ledgerFile: File | null;
  bankData: BankTransaction[];
  ledgerData: LedgerEntry[];
  results: MatchResult[];
  summary: ReconciliationSummary | null;
  isProcessing: boolean;
  currentStep: "upload" | "processing" | "review" | "export";
}

export interface MatchApiResponse {
  results: MatchResult[];
  summary: ReconciliationSummary;
}
