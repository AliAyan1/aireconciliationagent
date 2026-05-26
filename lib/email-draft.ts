import { APP_NAME } from "./branding";
import type { ReconciliationSummary } from "./types";
import { formatPKR } from "./format";

export function buildSummaryEmailDraft(
  summary: ReconciliationSummary,
  periodLabel = "this period"
): string {
  const matched =
    summary.autoMatched + (summary.posted ?? 0);
  const total = summary.totalBankTxns;
  const rate = summary.matchRate.toFixed(0);
  const review = summary.needsReview;
  const unmatched = summary.unmatched;
  const diff = formatPKR(Math.abs(summary.difference));

  return `Hi Team,

The ${periodLabel} ${APP_NAME} run is complete.

• ${matched} of ${total} transactions matched (${rate}% match rate)
• ${review} required manual review
• ${unmatched} remain unmatched (${diff} net difference)

Full report attached.

Regards,
[Your Name]`;
}
