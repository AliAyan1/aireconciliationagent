import type { MatchResult } from "./types";

export interface FraudAlert {
  matchId: string;
  message: string;
}

const REPORTING_THRESHOLDS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

function isRoundAmount(amount: number): boolean {
  const a = Math.abs(amount);
  if (a >= 100_000 && a % 100_000 === 0) return true;
  if (a >= 10_000 && a % 10_000 === 0) return true;
  return false;
}

function nearThreshold(amount: number): boolean {
  const a = Math.abs(amount);
  for (const t of REPORTING_THRESHOLDS) {
    if (a >= t * 0.95 && a < t) return true;
  }
  return false;
}

export function detectFraudPatterns(results: MatchResult[]): FraudAlert[] {
  const alerts: FraudAlert[] = [];
  const byAmountDate = new Map<string, string[]>();

  for (const r of results) {
    const txn = r.bankTransaction ?? r.ledgerEntry;
    if (!txn) continue;
    const key = `${txn.date.slice(0, 10)}|${txn.amount}`;
    const list = byAmountDate.get(key) ?? [];
    list.push(r.id);
    byAmountDate.set(key, list);
  }

  for (const [key, ids] of byAmountDate) {
    if (ids.length >= 2) {
      const [date, amt] = key.split("|");
      for (const id of ids) {
        alerts.push({
          matchId: id,
          message: `Duplicate amount PKR ${Number(amt).toLocaleString()} on ${date}`,
        });
      }
    }
  }

  for (const r of results) {
    const txn = r.bankTransaction ?? r.ledgerEntry;
    if (!txn) continue;
    if (isRoundAmount(txn.amount)) {
      alerts.push({
        matchId: r.id,
        message: `Round-number transaction PKR ${txn.amount.toLocaleString()}`,
      });
    }
    if (nearThreshold(txn.amount)) {
      alerts.push({
        matchId: r.id,
        message: `Amount just below reporting threshold (PKR ${txn.amount.toLocaleString()})`,
      });
    }
  }

  const seen = new Set<string>();
  return alerts.filter((a) => {
    const k = `${a.matchId}|${a.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 20);
}

export function fraudMapFromAlerts(alerts: FraudAlert[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of alerts) {
    map[a.matchId] = map[a.matchId]
      ? `${map[a.matchId]}; ${a.message}`
      : a.message;
  }
  return map;
}
