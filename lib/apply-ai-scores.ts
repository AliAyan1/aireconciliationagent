import {
  applyAIScores,
  getAIScoringCandidates,
} from "./matcher";
import { isOpenAIConfigured, scoreFuzzyMatches } from "./openai";
import type { MatchResult } from "./types";

/** Run Phase 5 AI scoring on rule-based results (non-blocking on failure). */
export async function applyAiScoresToResults(
  results: MatchResult[]
): Promise<{
  results: MatchResult[];
  aiUsed: boolean;
  pairsScored: number;
  candidateCount: number;
}> {
  if (!isOpenAIConfigured()) {
    return {
      results,
      aiUsed: false,
      pairsScored: 0,
      candidateCount: 0,
    };
  }

  const candidates = getAIScoringCandidates(results);
  if (candidates.length === 0) {
    return {
      results,
      aiUsed: true,
      pairsScored: 0,
      candidateCount: 0,
    };
  }

  try {
    const scores = await scoreFuzzyMatches(candidates);
    const updated = applyAIScores(results, scores);
    return {
      results: updated,
      aiUsed: true,
      pairsScored: scores.length,
      candidateCount: candidates.length,
    };
  } catch (error) {
    console.error("AI scoring failed, returning rule-based results:", error);
    return {
      results,
      aiUsed: false,
      pairsScored: 0,
      candidateCount: candidates.length,
    };
  }
}
