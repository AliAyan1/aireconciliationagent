import type { SessionAuditMeta } from "./audit-certificate";
import type { MatchResult, ReconciliationSummary } from "./types";

export interface ShareSnapshot {
  results: MatchResult[];
  summary: ReconciliationSummary;
  auditMeta?: SessionAuditMeta;
  sharedAt: string;
}

export function buildShareUrl(token: string): string {
  if (typeof window === "undefined") {
    return `/share/${token}`;
  }
  return `${window.location.origin}/share/${token}`;
}
