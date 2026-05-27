"use client";

import { ActivityLogPanel } from "@/components/security/ActivityLogPanel";
import { DeleteMyDataPanel } from "@/components/security/DeleteMyDataPanel";
import { MatchingSettingsPanel } from "@/components/settings/MatchingSettingsPanel";
import type { BankTransaction, LedgerEntry, MatchResult } from "@/lib/types";
import type { ReconciliationSummary } from "@/lib/types";

interface DashboardSettingsProps {
  onResetTable: () => void;
  results?: MatchResult[];
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
  onRematchComplete?: (
    results: MatchResult[],
    summary: ReconciliationSummary
  ) => void;
}

export function DashboardSettings({
  onResetTable,
  results,
  bankData,
  ledgerData,
  onRematchComplete,
}: DashboardSettingsProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-primary mb-6">
        Configuration &amp; settings
      </h2>
      <MatchingSettingsPanel
        results={results}
        bankData={bankData}
        ledgerData={ledgerData}
        onRematchComplete={onRematchComplete}
        onResetTable={onResetTable}
      />
      <div className="mt-8 space-y-6">
        <ActivityLogPanel />
        <DeleteMyDataPanel />
      </div>
    </div>
  );
}
