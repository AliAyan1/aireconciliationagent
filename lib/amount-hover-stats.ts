import type { BankTransaction, LedgerEntry } from "./types";

export interface RankedAmount {
  id: string;
  amount: number;
}

export interface AmountPoolIndex {
  totalVolume: number;
  monthPhrase: string;
  credits: RankedAmount[];
  debits: RankedAmount[];
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function monthPhraseForDates(dates: string[]): string {
  if (dates.length === 0) return "this period";
  const keys = new Set(
    dates
      .map((d) => {
        const parsed = new Date(d);
        if (Number.isNaN(parsed.getTime())) return "";
        return `${parsed.getFullYear()}-${parsed.getMonth()}`;
      })
      .filter(Boolean)
  );
  if (keys.size !== 1) return "this period";
  const sample = new Date(dates[0]);
  if (Number.isNaN(sample.getTime())) return "this month";
  const now = new Date();
  const sameAsNow =
    sample.getFullYear() === now.getFullYear() &&
    sample.getMonth() === now.getMonth();
  if (sameAsNow) return "this month";
  return `in ${sample.toLocaleDateString("en-US", { month: "long" })}`;
}

function buildPoolIndex<T extends { id: string; amount: number; type: "debit" | "credit"; date: string }>(
  items: T[]
): AmountPoolIndex {
  const credits: RankedAmount[] = [];
  const debits: RankedAmount[] = [];

  for (const item of items) {
    const entry = { id: item.id, amount: item.amount };
    if (item.type === "credit") credits.push(entry);
    else debits.push(entry);
  }

  credits.sort((a, b) => b.amount - a.amount);
  debits.sort((a, b) => b.amount - a.amount);

  const totalVolume = items.reduce((sum, t) => sum + t.amount, 0);

  return {
    totalVolume,
    monthPhrase: monthPhraseForDates(items.map((t) => t.date)),
    credits,
    debits,
  };
}

export function buildBankAmountIndex(
  transactions: BankTransaction[]
): AmountPoolIndex {
  return buildPoolIndex(transactions);
}

export function buildLedgerAmountIndex(
  entries: LedgerEntry[]
): AmountPoolIndex {
  return buildPoolIndex(entries);
}

function findRank(
  pool: RankedAmount[],
  amount: number,
  transactionId?: string
): number {
  if (transactionId) {
    const idx = pool.findIndex((t) => t.id === transactionId);
    if (idx >= 0) return idx + 1;
  }
  const idx = pool.findIndex((t) => Math.abs(t.amount - amount) < 0.01);
  return idx >= 0 ? idx + 1 : 0;
}

export function getAmountHoverLines(
  index: AmountPoolIndex,
  amount: number,
  options: {
    transactionId?: string;
    type?: "debit" | "credit";
    entityLabel: "bank transactions" | "ledger entries";
  }
): string[] {
  const lines: string[] = [];

  if (index.totalVolume > 0 && amount > 0) {
    const pct = (amount / index.totalVolume) * 100;
    lines.push(
      `This is ${pct.toFixed(1)}% of total ${options.entityLabel}`
    );
  }

  const txnType = options.type;
  if (txnType) {
    const pool = txnType === "credit" ? index.credits : index.debits;
    const rank = findRank(pool, amount, options.transactionId);
    if (rank > 0 && pool.length > 1) {
      lines.push(
        `${ordinal(rank)} largest ${txnType} ${index.monthPhrase}`
      );
    } else if (rank === 1 && pool.length === 1) {
      lines.push(`Largest ${txnType} ${index.monthPhrase}`);
    }
  }

  return lines;
}
