import type { MatchResult } from "./types";

export function isMatchAIScored(match: MatchResult): boolean {
  return (
    match.aiMetadata?.aiScored === true ||
    match.matchType === "ai_scored" ||
    match.matchReason.startsWith("AI:")
  );
}

export function getMatchAIReasoning(match: MatchResult): string | undefined {
  const fromMeta = match.aiMetadata?.aiReasoning?.trim();
  if (fromMeta) return fromMeta;
  if (match.matchReason.startsWith("AI:")) {
    return match.matchReason.replace(/^AI:\s*/, "").trim();
  }
  return undefined;
}

export function isAINewCrossMatch(match: MatchResult): boolean {
  return match.id.startsWith("ai-cross__") && isMatchAIScored(match);
}

export function isAIConfirmedUnmatched(match: MatchResult): boolean {
  if (match.status !== "unmatched" || !isMatchAIScored(match)) return false;
  const conf = match.aiMetadata?.aiConfidence ?? match.confidence;
  return conf < 70;
}

export function filterAIResults(results: MatchResult[]): MatchResult[] {
  return results.filter(
    (r) => isMatchAIScored(r) && r.bankTransaction && r.ledgerEntry
  );
}

export function countNewAIMatches(results: MatchResult[]): number {
  return results.filter(
    (r) =>
      isAINewCrossMatch(r) &&
      (r.status === "auto_matched" || r.status === "review")
  ).length;
}
