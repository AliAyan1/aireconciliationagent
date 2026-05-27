import type { BankTransaction, LedgerEntry, MatchResult } from "./types";

export type TransactionCategory =
  | "Salary"
  | "Utilities"
  | "Vendor Payments"
  | "Tax"
  | "Bank Charges"
  | "Cash"
  | "Transfers"
  | "Mobile Wallet"
  | "Other";

const CATEGORY_RULES: { category: TransactionCategory; keywords: string[] }[] =
  [
    {
      category: "Bank Charges",
      keywords: [
        "CHARGES",
        "CHARGE",
        " FEE",
        "FEE ",
        "FEES",
        "SERVICE CHG",
        "SERVICE CHARGE",
        "COMMISSION",
        "AMC",
        "SMS ALERT",
        "BANK CHG",
      ],
    },
    { category: "Salary", keywords: ["SALARY", "PAYROLL", "WAGE", "SALARIES", "BONUS"] },
    {
      category: "Utilities",
      keywords: [
        "KESC",
        "K-ELECTRIC",
        " KE ",
        "SSGC",
        "WAPDA",
        "UTILITY",
        "ELECTRIC",
        "GAS BILL",
        "WATER BILL",
        "PTCL",
        "IESCO",
        "LESCO",
      ],
    },
    { category: "Tax", keywords: ["FBR", "WITHHOLD", "TAX", "GST", "SALES TAX", "WHT", "INCOME TAX"] },
    { category: "Mobile Wallet", keywords: ["JAZZ CASH", "JAZZCASH", "EASYPAISA", "EASY PAISA", "SADAPAY", "NAYAPAY"] },
    { category: "Cash", keywords: ["ATM", "CASH WITH", "CASH WDL", "WITHDRAWAL"] },
    { category: "Transfers", keywords: [" TRF", "TRANSFER", "NIFT", "RTGS", "IBFT", "ONLINE TRF", "FUND TRF"] },
    { category: "Vendor Payments", keywords: ["VENDOR", "SUPPLIER", "INVOICE", "PAYMENT TO", "PURCHASE", "GOODS"] },
  ];

export function categorizeDescription(description: string): TransactionCategory {
  const upper = description.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => upper.includes(kw))) {
      return rule.category;
    }
  }
  return "Other";
}

/** Detect fees/charges without matching unrelated text like "SERVICES". */
export function isBankCharge(description: string): boolean {
  const upper = description.toUpperCase();
  if (categorizeDescription(description) === "Bank Charges") return true;
  if (upper.includes("CHARGES") || upper.includes("COMMISSION")) return true;
  if (/\bFEE\b|\bFEES\b/.test(upper)) return true;
  if (
    upper.includes("SERVICE CHG") ||
    upper.includes("SERVICE CHARGE") ||
    upper.includes("BANK SERVICE")
  ) {
    return true;
  }
  return false;
}

export function categorizeTransaction(
  bank?: BankTransaction | null,
  ledger?: LedgerEntry | null
): TransactionCategory {
  const desc = bank?.description ?? ledger?.description ?? "";
  return categorizeDescription(desc);
}

export function categorizeMatchResult(result: MatchResult): TransactionCategory {
  return categorizeTransaction(
    result.bankTransaction,
    result.ledgerEntry
  );
}

export interface CategoryBreakdownItem {
  category: TransactionCategory;
  count: number;
  amount: number;
  percent: number;
}

export function buildCategoryBreakdown(
  results: MatchResult[]
): CategoryBreakdownItem[] {
  const totals = new Map<TransactionCategory, { count: number; amount: number }>();

  for (const r of results) {
    const txn = r.bankTransaction ?? r.ledgerEntry;
    if (!txn) continue;
    const cat = categorizeMatchResult(r);
    const prev = totals.get(cat) ?? { count: 0, amount: 0 };
    totals.set(cat, {
      count: prev.count + 1,
      amount: prev.amount + txn.amount,
    });
  }

  const grand = [...totals.values()].reduce((s, v) => s + v.amount, 0) || 1;

  return [...totals.entries()]
    .map(([category, { count, amount }]) => ({
      category,
      count,
      amount,
      percent: Math.round((amount / grand) * 1000) / 10,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface BankChargesSummary {
  count: number;
  total: number;
  items: { id: string; description: string; amount: number; date: string; type: "debit" | "credit" }[];
}

export function summarizeBankCharges(
  results: MatchResult[]
): BankChargesSummary {
  const items: BankChargesSummary["items"] = [];

  for (const r of results) {
    const bank = r.bankTransaction;
    if (!bank || !isBankCharge(bank.description)) continue;
    items.push({
      id: bank.id,
      description: bank.description,
      amount: bank.amount,
      date: bank.date,
      type: bank.type,
    });
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  return { count: items.length, total, items };
}
