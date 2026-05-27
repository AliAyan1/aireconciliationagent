import {
  categorizeDescription,
  type TransactionCategory,
} from "./transaction-categories";

export interface SessionPeriodSnapshot {
  id: string;
  createdAt: string;
  matchRate: number;
  totalUnmatched: number;
  bankFileName: string;
}

export interface MonthlyMatchRate {
  periodKey: string;
  label: string;
  matchRate: number;
  sessionCount: number;
}

export interface ConsistentUnmatchedCategory {
  category: TransactionCategory;
  sessionCount: number;
  example: string;
}

export interface PeriodComparisonResult {
  monthly: MonthlyMatchRate[];
  periodNarrative: string | null;
  trend: "up" | "down" | "flat" | null;
  consistentUnmatched: ConsistentUnmatchedCategory[];
}

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function buildMonthlyMatchRates(
  sessions: SessionPeriodSnapshot[]
): MonthlyMatchRate[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const s of sessions) {
    const key = monthKey(new Date(s.createdAt));
    const prev = buckets.get(key) ?? { sum: 0, count: 0 };
    buckets.set(key, {
      sum: prev.sum + s.matchRate,
      count: prev.count + 1,
    });
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, { sum, count }]) => ({
      periodKey,
      label: monthLabel(periodKey),
      matchRate: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
      sessionCount: count,
    }));
}

export function buildPeriodNarrative(
  monthly: MonthlyMatchRate[]
): { narrative: string | null; trend: "up" | "down" | "flat" | null } {
  if (monthly.length < 2) {
    return { narrative: null, trend: null };
  }

  const prev = monthly[monthly.length - 2];
  const latest = monthly[monthly.length - 1];
  const delta = latest.matchRate - prev.matchRate;
  const trend =
    Math.abs(delta) < 0.5 ? "flat" : delta > 0 ? "up" : "down";

  const prevShort = prev.label.split(" ")[0];
  const latestShort = latest.label.split(" ")[0];

  let tail = "holding steady";
  if (trend === "up") tail = "trending up";
  if (trend === "down") tail = "trending down";

  const narrative =
    `${prevShort} match rate was ${prev.matchRate}%, ${latestShort} is ${latest.matchRate}% — ${tail}.`;

  return { narrative, trend };
}

export function buildConsistentUnmatchedCategories(
  unmatchedBySession: { sessionId: string; descriptions: string[] }[]
): ConsistentUnmatchedCategory[] {
  const categorySessions = new Map<
    TransactionCategory,
    { sessions: Set<string>; example: string }
  >();

  for (const { sessionId, descriptions } of unmatchedBySession) {
    const seenInSession = new Set<TransactionCategory>();
    for (const desc of descriptions) {
      const cat = categorizeDescription(desc);
      if (seenInSession.has(cat)) continue;
      seenInSession.add(cat);
      const prev = categorySessions.get(cat) ?? {
        sessions: new Set<string>(),
        example: desc,
      };
      prev.sessions.add(sessionId);
      categorySessions.set(cat, prev);
    }
  }

  return [...categorySessions.entries()]
    .filter(([, v]) => v.sessions.size >= 2)
    .map(([category, v]) => ({
      category,
      sessionCount: v.sessions.size,
      example: v.example.slice(0, 50),
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount);
}

export function buildPeriodComparison(
  sessions: SessionPeriodSnapshot[],
  unmatchedBySession: { sessionId: string; descriptions: string[] }[]
): PeriodComparisonResult {
  const monthly = buildMonthlyMatchRates(sessions);
  const { narrative, trend } = buildPeriodNarrative(monthly);
  const consistentUnmatched = buildConsistentUnmatchedCategories(
    unmatchedBySession
  );

  return {
    monthly,
    periodNarrative: narrative,
    trend,
    consistentUnmatched,
  };
}
