import { formatProcessingTimeSeconds, type SessionAuditMeta } from "./audit-certificate";
import { getSummary } from "./matcher";
import type { SessionAIMeta } from "./session";
import type {
  BankTransaction,
  LedgerEntry,
  MatchResult,
  ReconciliationSummary,
} from "./types";

export interface AchievementBadge {
  id: string;
  emoji: string;
  title: string;
  tagline: string;
  earned: boolean;
}

export interface BadgeContext {
  summary: ReconciliationSummary;
  results: MatchResult[];
  bankData: BankTransaction[];
  ledgerData: LedgerEntry[];
  auditMeta?: SessionAuditMeta;
  aiMeta?: SessionAIMeta;
}

function rulesOnlyMatchRate(
  results: MatchResult[],
  bankData: BankTransaction[],
  ledgerData: LedgerEntry[]
): number {
  const demoted = results.map((r) => {
    if (
      r.matchType === "ai_scored" &&
      (r.status === "auto_matched" || r.status === "posted")
    ) {
      return { ...r, status: "review" as const };
    }
    return r;
  });
  return getSummary(demoted, bankData, ledgerData).matchRate;
}

function totalProcessingSeconds(auditMeta?: SessionAuditMeta): number | null {
  if (!auditMeta) return null;
  const totalMs =
    (auditMeta.rulesProcessingTimeMs ?? 0) +
    (auditMeta.aiProcessingTimeMs ?? 0);
  if (totalMs <= 0) return null;
  return formatProcessingTimeSeconds(
    auditMeta.rulesProcessingTimeMs,
    auditMeta.aiProcessingTimeMs
  );
}

export function computeAchievementBadges(ctx: BadgeContext): AchievementBadge[] {
  const { summary, results, bankData, ledgerData, auditMeta, aiMeta } = ctx;
  const hasData = summary.totalBankTxns > 0;

  const sharpshooter = hasData && summary.matchRate >= 95;

  const processingSeconds = totalProcessingSeconds(auditMeta);
  const speedDemon =
    processingSeconds !== null && processingSeconds < 10;

  const cleanSweep = hasData && summary.unmatched === 0;

  let aiMaster = false;
  const aiUsed =
    !!aiMeta?.aiScoringUsed && (aiMeta.aiPairsScored ?? 0) > 0;
  if (aiUsed && hasData) {
    const withAi = summary.matchRate;
    const withoutAi = rulesOnlyMatchRate(results, bankData, ledgerData);
    aiMaster = withAi - withoutAi >= 5;
  }

  return [
    {
      id: "sharpshooter",
      emoji: "🎯",
      title: "Sharpshooter",
      tagline: "95%+ match rate",
      earned: sharpshooter,
    },
    {
      id: "speed-demon",
      emoji: "⚡",
      title: "Speed Demon",
      tagline: "Under 10 seconds",
      earned: speedDemon,
    },
    {
      id: "clean-sweep",
      emoji: "🧹",
      title: "Clean Sweep",
      tagline: "0 unmatched items",
      earned: cleanSweep,
    },
    {
      id: "ai-master",
      emoji: "🤖",
      title: "AI Master",
      tagline: "AI improved match rate by 5%+",
      earned: aiMaster,
    },
  ];
}

export function countEarnedBadges(badges: AchievementBadge[]): number {
  return badges.filter((b) => b.earned).length;
}
