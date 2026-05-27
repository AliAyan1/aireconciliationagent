import { categorizeDescription } from "./transaction-categories";
import type { MatchResult } from "./types";

export interface TransactionCluster {
  id: string;
  label: string;
  count: number;
  totalAmount: number;
  matchIds: string[];
}

export function clusterTransactions(results: MatchResult[]): TransactionCluster[] {
  const groups = new Map<string, { ids: string[]; total: number }>();

  for (const r of results) {
    const desc =
      r.bankTransaction?.description ??
      r.ledgerEntry?.description ??
      "";
    const cat = categorizeDescription(desc);
    const key = cat;
    const g = groups.get(key) ?? { ids: [], total: 0 };
    g.ids.push(r.id);
    g.total += r.bankTransaction?.amount ?? r.ledgerEntry?.amount ?? 0;
    groups.set(key, g);
  }

  return [...groups.entries()]
    .map(([label, g]) => ({
      id: label.replace(/\s+/g, "-").toLowerCase(),
      label,
      count: g.ids.length,
      totalAmount: g.total,
      matchIds: g.ids,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}
