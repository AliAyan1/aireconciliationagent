"use client";

import { useMemo, useState } from "react";
import { clusterTransactions, type TransactionCluster } from "@/lib/transaction-clusters";
import type { MatchResult } from "@/lib/types";
import { formatPKR } from "@/lib/format";

interface TransactionClusterViewProps {
  results: MatchResult[];
  onSelectCluster?: (matchIds: string[]) => void;
}

export function TransactionClusterView({
  results,
  onSelectCluster,
}: TransactionClusterViewProps) {
  const clusters = useMemo(() => clusterTransactions(results), [results]);
  const [openId, setOpenId] = useState<string | null>(null);

  if (clusters.length <= 1) return null;

  return (
    <div className="glass-card p-4 mb-6">
      <p className="text-sm font-semibold text-primary mb-3">
        Transaction clusters
      </p>
      <div className="space-y-2">
        {clusters.map((c: TransactionCluster) => (
          <div key={c.id} className="border border-default rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-card-hover"
              onClick={() => setOpenId(openId === c.id ? null : c.id)}
            >
              <span className="text-sm font-medium text-primary">{c.label}</span>
              <span className="text-xs text-muted">
                {c.count} items · {formatPKR(c.totalAmount)}
              </span>
            </button>
            {openId === c.id && (
              <div className="px-4 pb-3 border-t border-default">
                <button
                  type="button"
                  className="text-xs text-accent hover:underline mt-2"
                  onClick={() => onSelectCluster?.(c.matchIds)}
                >
                  Filter dashboard to this group
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
