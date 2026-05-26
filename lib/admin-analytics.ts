import { prisma } from "./db";
import { isDatabaseConfigured } from "./db";

export async function getAdminOverview() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const sessions = await prisma.reconciliationSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      matchResults: {
        select: {
          status: true,
          matchType: true,
          confidence: true,
          aiScored: true,
          aiReasoning: true,
          bankTransaction: { select: { description: true, amount: true } },
          ledgerEntry: { select: { description: true, amount: true } },
        },
      },
    },
  });

  const totalSessions = sessions.length;
  const aiSessions = sessions.filter((s) => s.aiScoringUsed).length;
  const avgMatchRate =
    totalSessions > 0
      ? sessions.reduce((sum, s) => sum + s.matchRate, 0) / totalSessions
      : 0;

  let totalAuto = 0;
  let totalReview = 0;
  let totalUnmatched = 0;
  let totalPosted = 0;
  let aiScoredMatches = 0;

  const aiRecommendations: {
    sessionId: string;
    sessionName: string;
    confidence: number;
    reasoning: string;
    bankDesc: string;
    ledgerDesc: string;
  }[] = [];

  for (const session of sessions) {
    for (const m of session.matchResults) {
      if (m.status === "AUTO_MATCHED" || m.status === "POSTED") totalAuto++;
      if (m.status === "REVIEW") totalReview++;
      if (m.status === "UNMATCHED") totalUnmatched++;
      if (m.status === "POSTED") totalPosted++;
      if (m.aiScored) {
        aiScoredMatches++;
        if (m.aiReasoning && aiRecommendations.length < 20) {
          aiRecommendations.push({
            sessionId: session.id,
            sessionName: session.name ?? session.bankFileName,
            confidence: m.confidence,
            reasoning: m.aiReasoning,
            bankDesc: m.bankTransaction?.description ?? "—",
            ledgerDesc: m.ledgerEntry?.description ?? "—",
          });
        }
      }
    }
  }

  const recentSessions = sessions.slice(0, 12).map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    name: s.name,
    status: s.status,
    bankFileName: s.bankFileName,
    ledgerFileName: s.ledgerFileName,
    matchRate: s.matchRate,
    totalAutoMatched: s.totalAutoMatched,
    totalNeedsReview: s.totalNeedsReview,
    totalUnmatched: s.totalUnmatched,
    totalPosted: s.totalPosted,
    aiScoringUsed: s.aiScoringUsed,
    aiPairsScored: s.aiPairsScored,
    amountDifference: s.amountDifference,
  }));

  const matchTypeBreakdown = {
    exact: 0,
    near: 0,
    fuzzy: 0,
    ai_scored: 0,
    unmatched: 0,
    other: 0,
  };

  for (const session of sessions) {
    for (const m of session.matchResults) {
      switch (m.matchType) {
        case "EXACT":
          matchTypeBreakdown.exact++;
          break;
        case "NEAR":
          matchTypeBreakdown.near++;
          break;
        case "FUZZY":
          matchTypeBreakdown.fuzzy++;
          break;
        case "AI_SCORED":
          matchTypeBreakdown.ai_scored++;
          break;
        case "UNMATCHED":
          matchTypeBreakdown.unmatched++;
          break;
        default:
          matchTypeBreakdown.other++;
      }
    }
  }

  return {
    totals: {
      sessions: totalSessions,
      aiSessions,
      avgMatchRate: Math.round(avgMatchRate * 10) / 10,
      autoMatched: totalAuto,
      needsReview: totalReview,
      unmatched: totalUnmatched,
      posted: totalPosted,
      aiScoredMatches,
    },
    matchTypeBreakdown,
    recentSessions,
    aiRecommendations,
  };
}
