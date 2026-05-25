import type {
  BankTransaction,
  JournalPost,
  LedgerEntry,
  MatchResult,
  MissingEntryProposal,
  ReconciliationSummary,
} from "./types";

const STORAGE_KEY = "reconciliation-session";

export interface SessionData {
  results: MatchResult[];
  summary: ReconciliationSummary;
  bankData: BankTransaction[];
  ledgerData: LedgerEntry[];
  missingProposals: MissingEntryProposal[];
  journalPosts: JournalPost[];
}

export function saveSession(data: SessionData): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionData;
    return {
      ...parsed,
      missingProposals: parsed.missingProposals ?? [],
      journalPosts: parsed.journalPosts ?? [],
    };
  } catch {
    return null;
  }
}

export function updateSession(partial: Partial<SessionData>): void {
  const current = loadSession();
  if (!current) return;
  saveSession({ ...current, ...partial });
}

export function updateSessionResults(
  results: MatchResult[],
  summary: ReconciliationSummary
): void {
  updateSession({ results, summary });
}
