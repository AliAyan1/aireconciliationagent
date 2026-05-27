import type { MatchResult, ReconciliationSummary } from "./types";

export interface SessionSnapshot {
  id: string;
  savedAt: string;
  label: string;
  summary: ReconciliationSummary;
  matchFingerprints: Record<string, string>;
}

const KEY = "hisaab-session-snapshots";

function fingerprint(r: MatchResult): string {
  const b = r.bankTransaction;
  const l = r.ledgerEntry;
  return `${b?.description ?? ""}|${b?.amount ?? 0}|${l?.description ?? ""}|${l?.amount ?? 0}|${r.status}`;
}

export function saveSessionSnapshot(
  sessionId: string | null | undefined,
  results: MatchResult[],
  summary: ReconciliationSummary,
  label?: string
): SessionSnapshot {
  const snap: SessionSnapshot = {
    id: sessionId ?? `local-${Date.now()}`,
    savedAt: new Date().toISOString(),
    label: label ?? `Run at ${new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}`,
    summary,
    matchFingerprints: Object.fromEntries(
      results
        .filter((r) => r.bankTransaction || r.ledgerEntry)
        .map((r) => [r.id, fingerprint(r)])
    ),
  };

  if (typeof window !== "undefined") {
    const all = loadSnapshotsForSession(snap.id);
    all.push(snap);
    const trimmed = all.slice(-5);
    localStorage.setItem(`${KEY}:${snap.id}`, JSON.stringify(trimmed));
  }
  return snap;
}

export function loadSnapshotsForSession(sessionId: string): SessionSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${KEY}:${sessionId}`);
    return raw ? (JSON.parse(raw) as SessionSnapshot[]) : [];
  } catch {
    return [];
  }
}

export interface ComparisonReport {
  narrative: string;
  newMatches: number;
  changedMatches: number;
  newlyMatched: number;
}

export function compareSnapshots(
  previous: SessionSnapshot,
  current: MatchResult[],
  currentSummary: ReconciliationSummary
): ComparisonReport {
  const prevMatched = previous.summary.autoMatched + (previous.summary.posted ?? 0);
  const currMatched =
    currentSummary.autoMatched + (currentSummary.posted ?? 0);

  let changed = 0;
  let newlyMatched = 0;

  for (const r of current) {
    const prev = previous.matchFingerprints[r.id];
    const fp = fingerprint(r);
    if (!prev && r.status !== "unmatched" && r.bankTransaction && r.ledgerEntry) {
      newlyMatched += 1;
    } else if (prev && prev !== fp) {
      changed += 1;
    }
  }

  const newMatches = Math.max(0, currMatched - prevMatched);

  const narrative = `Report comparison: ${newMatches} new match${newMatches === 1 ? "" : "es"} found, ${changed} match${changed === 1 ? "" : "es"} changed, ${newlyMatched} previously unmatched now matched.`;

  return {
    narrative,
    newMatches,
    changedMatches: changed,
    newlyMatched,
  };
}
