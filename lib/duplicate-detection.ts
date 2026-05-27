import type { BankTransaction, LedgerEntry } from "./types";

export interface DuplicateWarning {
  source: "bank" | "ledger";
  rowA: number;
  rowB: number;
  amount: number;
  date: string;
  description: string;
  confidence: number;
}

function rowKey(date: string, amount: number, desc: string): string {
  return `${date.slice(0, 10)}|${amount}|${desc.slice(0, 40).toUpperCase()}`;
}

export function findDuplicateRows(
  bank: BankTransaction[],
  ledger: LedgerEntry[]
): DuplicateWarning[] {
  const warnings: DuplicateWarning[] = [];

  function scan<T extends { date: string; amount: number; description: string }>(
    rows: T[],
    source: "bank" | "ledger"
  ) {
    const index = new Map<string, number[]>();
    rows.forEach((row, i) => {
      const k = rowKey(row.date, row.amount, row.description);
      const list = index.get(k) ?? [];
      list.push(i);
      index.set(k, list);
    });
    for (const [, indices] of index) {
      if (indices.length < 2) continue;
      const a = indices[0];
      const b = indices[1];
      const row = rows[a];
      warnings.push({
        source,
        rowA: a + 1,
        rowB: b + 1,
        amount: row.amount,
        date: row.date,
        description: row.description.slice(0, 60),
        confidence: 95,
      });
    }
  }

  scan(bank, "bank");
  scan(ledger, "ledger");
  return warnings.slice(0, 15);
}
