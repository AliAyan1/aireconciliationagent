import type { SessionAuditMeta } from "./audit-certificate";
import type {
  BankTransaction,
  JournalPost,
  LedgerEntry,
  MatchResult,
  MissingEntryProposal,
  ReconciliationSummary,
} from "./types";

export type { SessionAuditMeta };

const STORAGE_KEY = "reconciliation-session";
const SESSION_ID_KEY = "reconciliation-session-id";

export interface SessionAIMeta {
  aiScoringUsed: boolean;
  aiCandidateCount: number;
  aiPairsScored: number;
  aiProcessingTimeMs: number;
}

export interface SessionData {
  sessionId?: string | null;
  results: MatchResult[];
  summary: ReconciliationSummary;
  bankData: BankTransaction[];
  ledgerData: LedgerEntry[];
  missingProposals: MissingEntryProposal[];
  journalPosts: JournalPost[];
  aiMeta?: SessionAIMeta;
  auditMeta?: SessionAuditMeta;
}

export function saveSessionId(id: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_ID_KEY, id);
}

export function loadSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_ID_KEY);
}

export function saveSession(data: SessionData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (data.sessionId) {
    sessionStorage.setItem(SESSION_ID_KEY, data.sessionId);
  }
}

export function loadSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionData;
    return {
      ...parsed,
      sessionId: parsed.sessionId ?? loadSessionId(),
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

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_ID_KEY);
}
