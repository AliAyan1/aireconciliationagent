import Papa from "papaparse";
import type { BankTransaction, LedgerEntry } from "./types";

let idCounter = 0;

/** Strip BOM and normalize line endings (Excel / Windows exports). */
export function prepareCsvText(raw: string): string {
  return raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
}

function parseCsvTable(csvText: string) {
  const text = prepareCsvText(csvText);
  return Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
    delimitersToGuess: [",", ";", "\t", "|"],
  });
}

function assertParseResult(
  label: string,
  data: Record<string, string>[],
  errors: Papa.ParseError[]
): Record<string, string>[] {
  if (errors.length > 0) {
    throw new Error(`${label} CSV parse error: ${errors[0].message}`);
  }
  if (data.length === 0) {
    throw new Error(
      `${label} CSV is empty or has no data rows. Save as CSV (comma-separated) with a header row.`
    );
  }
  const headers = Object.keys(data[0] ?? {});
  if (headers.length < 2) {
    throw new Error(
      `${label} CSV headers not recognized. Expected columns like Date, Description, Amount.`
    );
  }
  return data;
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function parseAmount(value: string | undefined): number | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  const cleaned = value.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function normalizeDate(value: string | undefined): string {
  if (!value?.trim()) return "";
  const parsed = new Date(value.trim());
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return value.trim();
}

function getField(row: Record<string, string>, names: string[]): string {
  for (const name of names) {
    const key = Object.keys(row).find(
      (k) => k.toLowerCase().replace(/\s+/g, "_") === name.toLowerCase()
    );
    if (key && row[key]?.trim()) return row[key].trim();
  }
  return "";
}

export function normalizeDescription(desc: string): string {
  let text = desc.trim().toUpperCase().replace(/\s+/g, " ");

  const abbreviations: Record<string, string> = {
    TRF: "TRANSFER",
    CR: "CREDIT",
    CHQ: "CHEQUE",
    WDL: "WITHDRAWAL",
    DEP: "DEPOSIT",
    PMT: "PAYMENT",
    NEFT: "ELECTRONIC TRANSFER",
    IBFT: "INTER BANK TRANSFER",
    POS: "POINT OF SALE",
  };

  for (const [abbr, full] of Object.entries(abbreviations)) {
    const re = new RegExp(`\\b${abbr}\\b`, "gi");
    text = text.replace(re, full);
  }

  return text.replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function parseBankCSV(csvText: string): BankTransaction[] {
  idCounter = 0;
  const { data, errors } = parseCsvTable(csvText);
  const rows = assertParseResult("Bank", data, errors);

  return rows.map((row) => {
    const debit = parseAmount(getField(row, ["debit", "Debit"]) || row.Debit);
    const credit = parseAmount(
      getField(row, ["credit", "Credit"]) || row.Credit
    );
    const amount = debit ?? credit ?? 0;
    const type: "debit" | "credit" = debit !== null ? "debit" : "credit";
    const description = getField(row, ["description", "Description"]);

    return {
      id: nextId("bank"),
      date: normalizeDate(getField(row, ["date", "Date"]) || row.Date),
      description,
      normalizedDescription: normalizeDescription(description),
      debit,
      credit,
      amount,
      type,
      balance: parseAmount(
        getField(row, ["balance", "Balance"]) || row.Balance
      ),
      reference: getField(row, ["reference", "Reference"]) || row.Reference,
    };
  });
}

export function parseLedgerCSV(csvText: string): LedgerEntry[] {
  idCounter = 0;
  const { data, errors } = parseCsvTable(csvText);
  const rows = assertParseResult("Ledger", data, errors);

  return rows.map((row) => {
    const rawType = (
      getField(row, ["type", "Type"]) || row.Type || "debit"
    ).toLowerCase();
    const type: "debit" | "credit" =
      rawType === "credit" ? "credit" : "debit";
    const description = getField(row, ["description", "Description"]);

    return {
      id: nextId("ledger"),
      date: normalizeDate(getField(row, ["date", "Date"]) || row.Date),
      description,
      normalizedDescription: normalizeDescription(description),
      amount: parseAmount(getField(row, ["amount", "Amount"]) || row.Amount) ?? 0,
      type,
      reference: getField(row, ["reference", "Reference"]) || row.Reference,
      invoiceNo:
        getField(row, ["invoice_no", "Invoice_No", "invoice"]) ||
        row.Invoice_No ||
        "",
    };
  });
}
