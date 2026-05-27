import { APP_NAME } from "./branding";
import type { ReconciliationSummary } from "./types";
import { formatPKR } from "./format";

export function buildMailtoReportLink(
  summary: ReconciliationSummary,
  periodLabel: string
): string {
  const subject = encodeURIComponent(
    `${APP_NAME} — ${periodLabel} Reconciliation`
  );
  const matched = summary.autoMatched + (summary.posted ?? 0);
  const body = encodeURIComponent(
    `Hi Team,

The ${periodLabel} ${APP_NAME} reconciliation summary:

• ${matched} of ${summary.totalBankTxns} transactions matched (${summary.matchRate.toFixed(0)}% match rate)
• ${summary.needsReview} required manual review
• ${summary.unmatched} remain unmatched (${formatPKR(Math.abs(summary.difference))} net difference)

Please attach the exported CSV/PDF/Excel file from the dashboard.

Regards,
[Your Name]`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}
