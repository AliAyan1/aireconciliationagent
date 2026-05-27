import type { MatchResult } from "./types";
import { isMatchAIScored } from "./ai-display";

export type RiskLevel = "low" | "medium" | "high";

export interface RiskAssessment {
  level: RiskLevel;
  label: string;
  reasons: string[];
}

export function assessMatchRisk(match: MatchResult): RiskAssessment {
  const reasons: string[] = [];
  let score = 0;

  const bank = match.bankTransaction;
  const ledger = match.ledgerEntry;
  const amount = bank?.amount ?? ledger?.amount ?? 0;

  if (match.confidence < 70) {
    score += 3;
    reasons.push("Low match confidence");
  } else if (match.confidence < 85) {
    score += 1;
    reasons.push("Moderate confidence");
  }

  if (amount >= 500_000) {
    score += 2;
    reasons.push("Large PKR amount");
  } else if (amount >= 100_000) {
    score += 1;
  }

  if (bank && ledger) {
    const amtDiff = Math.abs(bank.amount - ledger.amount);
    if (amtDiff > 500) {
      score += 2;
      reasons.push(`Amount differs by PKR ${amtDiff.toLocaleString()}`);
    }
  }

  const factors = match.aiMetadata?.matchFactors;
  if (factors?.entityMatch === "low" || factors?.entityMatch === "none") {
    score += 2;
    reasons.push("Description names differ significantly");
  }

  if (isMatchAIScored(match) && match.confidence < 80) {
    score += 1;
    reasons.push("AI-suggested with uncertainty");
  }

  if (match.status === "review") score += 1;

  let level: RiskLevel = "low";
  if (score >= 5) level = "high";
  else if (score >= 3) level = "medium";

  const label =
    level === "high" ? "High risk" : level === "medium" ? "Medium risk" : "Low risk";

  return { level, label, reasons: reasons.slice(0, 3) };
}
