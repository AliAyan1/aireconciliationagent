import {
  DEFAULT_MATCHING_CONFIG,
  type MatchingConfig,
} from "./matching-config";
import {
  applyAIScores,
  getAIScoringCandidates,
} from "./matcher";
import { isOpenAIConfigured, scoreFuzzyMatches } from "./openai";
import type { MatchResult } from "./types";

/** Run Phase 5 AI scoring on rule-based results (non-blocking on failure). */
export async function applyAiScoresToResults(
  results: MatchResult[],
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): Promise<{
  results: MatchResult[];
  aiUsed: boolean;
  pairsScored: number;
  candidateCount: number;
}> {
  if (!config.enableAiScoring || !isOpenAIConfigured()) {
    return {
      results,
      aiUsed: false,
      pairsScored: 0,
      candidateCount: 0,
    };
  }

  const candidates = getAIScoringCandidates(results, config);
  if (candidates.length === 0) {
    return {
      results,
      aiUsed: true,
      pairsScored: 0,
      candidateCount: 0,
    };
  }

  try {
    const scores = await scoreFuzzyMatches(candidates, config.aiBatchSize);
    const updated = applyAIScores(results, scores, config);
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
