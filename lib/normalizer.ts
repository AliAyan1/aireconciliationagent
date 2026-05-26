import Papa from "papaparse";
import type { BankTransaction, LedgerEntry } from "./types";

let idCounter = 0;

/** Strip BOM and normalize line endings (Excel / Windows exports). */
export function prepareCsvText(raw: string): string {
  return raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
}

export function parseCsvTable(csvText: string) {
  const text = prepareCsvText(csvText);
  return Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
    delimitersToGuess: [",", ";", "\t", "|"],
  });
}

function formatParseError(label: string, err: Papa.ParseError): string {
  const parts: string[] = [`${label} file parse error`];
  if (err.row != null) parts.push(`row ${err.row + 1}`);
  if (err.index != null) parts.push(`column ${err.index + 1}`);
  return `${parts.join(", ")}: ${err.message}`;
}

function assertParseResult(
  label: string,
  data: Record<string, string>[],
  errors: Papa.ParseError[]
): Record<string, string>[] {
  if (errors.length > 0) {
    throw new Error(formatParseError(label, errors[0]));
  }
  if (data.length === 0) {
    throw new Error(
      `${label} file is empty or has no data rows. Include a header row with Date and Description.`
    );
  }
  const headers = Object.keys(data[0] ?? {});
  if (headers.length < 2) {
    throw new Error(
      `${label} file headers not recognized (row 1). Expected columns like Date, Description, Amount. Found: ${headers.join(", ") || "(none)"}`
    );
  }
  return data;
}

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function parseAmount(value: string | undefined): number | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  const cleaned = value.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

export function normalizeDate(value: string | undefined): string {
  if (!value?.trim()) return "";
  const parsed = new Date(value.trim());
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return value.trim();
}

export function getField(row: Record<string, string>, names: string[]): string {
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
  const label = "Bank";
  idCounter = 0;
  const { data, errors } = parseCsvTable(csvText);
  const rows = assertParseResult(label, data, errors);

  return rows.map((row, index) => {
    const rowNum = index + 2;
    const debit = parseAmount(getField(row, ["debit", "Debit"]) || row.Debit);
    const credit = parseAmount(
      getField(row, ["credit", "Credit"]) || row.Credit
    );
    if (debit === null && credit === null) {
      throw new Error(
        `${label} row ${rowNum}: missing Debit and Credit — at least one amount column is required.`
      );
    }
    const amount = debit ?? credit ?? 0;
    const type: "debit" | "credit" = debit !== null ? "debit" : "credit";
    const description = getField(row, ["description", "Description"]);
    if (!description) {
      throw new Error(
        `${label} row ${rowNum}: missing Description column value.`
      );
    }
    const date = normalizeDate(getField(row, ["date", "Date"]) || row.Date);
    if (!date) {
      throw new Error(
        `${label} row ${rowNum}: invalid or missing Date column value.`
      );
    }

    return {
      id: nextId("bank"),
      date,
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
  const label = "Ledger";
  idCounter = 0;
  const { data, errors } = parseCsvTable(csvText);
  const rows = assertParseResult(label, data, errors);

  return rows.map((row, index) => {
    const rowNum = index + 2;
    const rawType = (
      getField(row, ["type", "Type"]) || row.Type || "debit"
    ).toLowerCase();
    const type: "debit" | "credit" =
      rawType === "credit" ? "credit" : "debit";
    const description = getField(row, ["description", "Description"]);
    if (!description) {
      throw new Error(
        `${label} row ${rowNum}: missing Description column value.`
      );
    }
    const date = normalizeDate(getField(row, ["date", "Date"]) || row.Date);
    if (!date) {
      throw new Error(
        `${label} row ${rowNum}: invalid or missing Date column value.`
      );
    }
    const amount = parseAmount(
      getField(row, ["amount", "Amount"]) || row.Amount
    );
    if (amount === null) {
      throw new Error(
        `${label} row ${rowNum}: invalid or missing Amount column value.`
      );
    }

    return {
      id: nextId("ledger"),
      date,
      description,
      normalizedDescription: normalizeDescription(description),
      amount,
      type,
      reference: getField(row, ["reference", "Reference"]) || row.Reference,
      invoiceNo:
        getField(row, ["invoice_no", "Invoice_No", "invoice"]) ||
        row.Invoice_No ||
        "",
    };
  });
}
