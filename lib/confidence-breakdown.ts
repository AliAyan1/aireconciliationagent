import type { MatchResult } from "./types";

export interface ConfidenceFactorLine {
  label: string;
  points: number;
}

const FACTOR_POINTS: Record<string, number> = {
  high: 40,
  medium: 25,
  low: 12,
  none: 0,
};

export function getConfidenceBreakdown(
  match: MatchResult
): ConfidenceFactorLine[] {
  const factors = match.aiMetadata?.matchFactors;
  if (factors) {
    return [
      { label: "Amount match", points: FACTOR_POINTS[factors.amountMatch] ?? 0 },
      { label: "Date match", points: FACTOR_POINTS[factors.dateMatch] ?? 0 },
      { label: "Name similarity", points: FACTOR_POINTS[factors.entityMatch] ?? 0 },
      { label: "Reference match", points: FACTOR_POINTS[factors.referenceMatch] ?? 0 },
      { label: "Context", points: FACTOR_POINTS[factors.contextMatch] ?? 0 },
    ].filter((l) => l.points > 0);
  }

  const lines: ConfidenceFactorLine[] = [];
  if (match.matchType === "exact") {
    lines.push(
      { label: "Exact amount & date", points: 50 },
      { label: "Description match", points: 40 }
    );
  } else if (match.matchType === "near") {
    lines.push(
      { label: "Amount match", points: 40 },
      { label: "Near date", points: 30 },
      { label: "Description", points: 17 }
    );
  } else if (match.matchType === "fuzzy") {
    lines.push(
      { label: "Fuzzy amount", points: 35 },
      { label: "Date proximity", points: 25 },
      { label: "Description similarity", points: 20 }
    );
  } else {
    lines.push({ label: "AI semantic match", points: match.confidence });
  }

  const sum = lines.reduce((s, l) => s + l.points, 0);
  if (sum > 0 && sum !== match.confidence) {
    const scale = match.confidence / sum;
    return lines.map((l) => ({
      ...l,
      points: Math.round(l.points * scale),
    }));
  }
  return lines;
}
