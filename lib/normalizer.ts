import Papa from "papaparse";
import {
  DEFAULT_KEYWORD_BLACKLIST,
  loadMatchingConfig,
} from "./matching-config";
import type { BankTransaction, LedgerEntry } from "./types";

let idCounter = 0;

// ─── BOM + line-ending normalisation ──────────────────────────────────────

/** Strip UTF-8 BOM (hex EF BB BF or JS \uFEFF) and normalise CRLF → LF. */
export function prepareCsvText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")          // Unicode BOM
    .replace(/^\xEF\xBB\xBF/, "")   // Byte-level BOM (rare in JS strings)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

// ─── Delimiter detection ───────────────────────────────────────────────────

/**
 * Return ";" when the first non-empty line has more semicolons than commas;
 * otherwise return "," so PapaParse uses the standard delimiter.
 */
function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

// ─── Trailing-empty-row filter ─────────────────────────────────────────────

function isBlankRow(row: Record<string, string>): boolean {
  return Object.values(row).every((v) => !v || !v.trim());
}

// ─── CSV parse ────────────────────────────────────────────────────────────

export function parseCsvTable(csvText: string) {
  const text = prepareCsvText(csvText);
  const delimiter = detectDelimiter(text);

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
  });

  // Drop blank trailing rows Excel loves to leave behind
  result.data = result.data.filter((row) => !isBlankRow(row));

  return result;
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
  errors: Papa.ParseError[],
  filename?: string
): Record<string, string>[] {
  if (errors.length > 0) {
    throw new Error(formatParseError(label, errors[0]));
  }
  if (data.length === 0) {
    const filePart = filename ? ` in ${filename}` : "";
    throw new Error(`No data rows found${filePart}.`);
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

// ─── Amount parsing ────────────────────────────────────────────────────────

/**
 * Parse amounts from many real-world formats:
 *   "25000"  "25,000"  "25000.00"  "PKR 25,000"  "Rs. 25,000"  "-25000"
 * Returns null when the value is absent / unparseable.
 */
export function parseAmount(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const stripped = value
    .trim()
    // Strip currency prefixes: PKR, Rs., Rs, USD, $, £, € …
    .replace(/^[A-Z$£€]{1,3}\.?\s*/i, "")
    .replace(/^Rs\.?\s*/i, "")
    // Remove thousand-separator commas and spaces used as separators
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!stripped) return null;
  const n = parseFloat(stripped);
  return Number.isNaN(n) ? null : n;
}

// ─── Date parsing ──────────────────────────────────────────────────────────

const MONTH_ABBR: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse dates from multiple real-world formats and return "YYYY-MM-DD".
 *
 * Supported:
 *   "2026-05-01"            ISO
 *   "05/01/2026"            MM/DD/YYYY (US)
 *   "01/05/2026"            DD/MM/YYYY (UK / Pakistan)  — ambiguous; tried after US fails plausibility
 *   "01-May-2026"           DD-Mon-YYYY
 *   "May 1, 2026"           Month D, YYYY
 *   "1/5/2026"              D/M/YYYY (short)
 */
export function normalizeDate(value: string | undefined): string {
  if (!value?.trim()) return "";
  const raw = value.trim();

  // 1) ISO 8601 and similar unambiguous forms the JS Date constructor handles
  //    well: "2026-05-01", "2026-05-01T00:00:00Z"
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // 2) "01-May-2026" or "01 May 2026"
  const alphaMonthMatch = raw.match(
    /^(\d{1,2})[\s\-\/]([A-Za-z]{3,})[\s\-\/](\d{4})$/
  );
  if (alphaMonthMatch) {
    const [, day, mon, year] = alphaMonthMatch;
    const m = MONTH_ABBR[mon.toLowerCase().slice(0, 3)];
    if (m !== undefined) {
      return iso(Number(year), m, Number(day));
    }
  }

  // 3) "May 1, 2026" or "May 01 2026"
  const namedMonthFirst = raw.match(
    /^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/
  );
  if (namedMonthFirst) {
    const [, mon, day, year] = namedMonthFirst;
    const m = MONTH_ABBR[mon.toLowerCase().slice(0, 3)];
    if (m !== undefined) {
      return iso(Number(year), m, Number(day));
    }
  }

  // 4) Numeric forms: MM/DD/YYYY, DD/MM/YYYY, D/M/YY etc.
  //    Separator may be / - .
  const numericMatch = raw.match(
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/
  );
  if (numericMatch) {
    const [, a, b, rawYear] = numericMatch;
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    const av = Number(a);
    const bv = Number(b);

    // If a > 12 it cannot be a month → must be DD/MM/YYYY
    if (av > 12) {
      return iso(year, bv - 1, av);
    }
    // If b > 12 it cannot be a month → must be MM/DD/YYYY
    if (bv > 12) {
      return iso(year, av - 1, bv);
    }
    // Ambiguous: both ≤ 12.  Prefer DD/MM/YYYY (Pakistan / UK convention).
    return iso(year, bv - 1, av);
  }

  // 5) Last-resort: let JS Date try to parse it
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  // 6) Return empty — caller will surface a parse error
  return "";
}

function iso(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// ─── Field lookup ──────────────────────────────────────────────────────────

export function getField(row: Record<string, string>, names: string[]): string {
  for (const name of names) {
    const target = name.toLowerCase().replace(/\s+/g, "_");
    const key = Object.keys(row).find(
      (k) => k.toLowerCase().replace(/\s+/g, "_") === target
    );
    if (key && row[key]?.trim()) return row[key].trim();
  }
  return "";
}

// ─── Description normalisation ────────────────────────────────────────────

export function normalizeDescription(
  desc: string,
  keywordBlacklist?: string[]
): string {
  let text = desc.trim().toUpperCase().replace(/\s+/g, " ");

  const blacklist =
    keywordBlacklist ??
    (typeof window !== "undefined"
      ? loadMatchingConfig().keywordBlacklist
      : DEFAULT_KEYWORD_BLACKLIST);
  for (const word of blacklist) {
    const w = word.trim().toUpperCase();
    if (!w) continue;
    text = text.replace(new RegExp(`\\b${w}\\b`, "gi"), " ");
  }
  text = text.replace(/\s+/g, " ").trim();

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

// ─── Bank CSV parser ───────────────────────────────────────────────────────

/**
 * Detect whether a bank CSV uses a single signed "Amount" column instead of
 * separate Debit / Credit columns. Returns true when:
 *   - No "Debit" or "Credit" header exists
 *   - An "Amount" header exists
 */
function hasSingleAmountColumn(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const hasDebitCredit =
    lower.includes("debit") || lower.includes("credit");
  const hasAmount = lower.includes("amount");
  return hasAmount && !hasDebitCredit;
}

export function parseBankCSV(
  csvText: string,
  filename?: string
): BankTransaction[] {
  const label = "Bank";
  idCounter = 0;
  const { data, errors } = parseCsvTable(csvText);
  const rows = assertParseResult(label, data, errors, filename);

  const headers = Object.keys(rows[0] ?? {});
  const singleAmount = hasSingleAmountColumn(headers);

  return rows.map((row, index) => {
    const rowNum = index + 2;

    let debit: number | null = null;
    let credit: number | null = null;
    let amount: number;
    let type: "debit" | "credit";

    if (singleAmount) {
      // Signed Amount column: negative → debit, positive → credit
      const raw = parseAmount(
        getField(row, ["amount", "Amount"]) || row.Amount
      );
      if (raw === null) {
        throw new Error(
          `${label} row ${rowNum}: missing or invalid Amount value.`
        );
      }
      if (raw < 0) {
        debit = Math.abs(raw);
        amount = debit;
        type = "debit";
      } else {
        credit = raw;
        amount = credit;
        type = "credit";
      }
    } else {
      debit = parseAmount(
        getField(row, ["debit", "Debit"]) || row.Debit
      );
      credit = parseAmount(
        getField(row, ["credit", "Credit"]) || row.Credit
      );
      if (debit === null && credit === null) {
        throw new Error(
          `${label} row ${rowNum}: missing Debit and Credit — at least one amount column is required.`
        );
      }
      // Use absolute values — source data sometimes records negatives
      if (debit !== null) debit = Math.abs(debit);
      if (credit !== null) credit = Math.abs(credit);
      amount = debit ?? credit ?? 0;
      type = debit !== null ? "debit" : "credit";
    }

    const description = getField(row, ["description", "Description"]);
    if (!description) {
      throw new Error(
        `${label} row ${rowNum}: missing Description column value.`
      );
    }
    const date = normalizeDate(
      getField(row, ["date", "Date", "transaction_date", "value_date"]) ||
        row.Date
    );
    if (!date) {
      throw new Error(
        `${label} row ${rowNum}: invalid or missing Date value.`
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
        getField(row, ["balance", "Balance", "running_balance"]) ||
          row.Balance
      ),
      reference:
        getField(row, ["reference", "Reference", "ref"]) || row.Reference,
    };
  });
}

// ─── Ledger CSV parser ────────────────────────────────────────────────────

export function parseLedgerCSV(
  csvText: string,
  filename?: string
): LedgerEntry[] {
  const label = "Ledger";
  idCounter = 0;
  const { data, errors } = parseCsvTable(csvText);
  const rows = assertParseResult(label, data, errors, filename);

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
    const date = normalizeDate(
      getField(row, ["date", "Date", "transaction_date", "entry_date"]) ||
        row.Date
    );
    if (!date) {
      throw new Error(
        `${label} row ${rowNum}: invalid or missing Date value.`
      );
    }

    const rawAmount = parseAmount(
      getField(row, ["amount", "Amount"]) || row.Amount
    );
    if (rawAmount === null) {
      throw new Error(
        `${label} row ${rowNum}: invalid or missing Amount value.`
      );
    }
    // Ledger amounts are always stored as positive values; sign comes from type
    const amount = Math.abs(rawAmount);

    return {
      id: nextId("ledger"),
      date,
      description,
      normalizedDescription: normalizeDescription(description),
      amount,
      type,
      reference:
        getField(row, ["reference", "Reference", "ref"]) || row.Reference,
      invoiceNo:
        getField(row, [
          "invoice_no",
          "Invoice_No",
          "invoice",
          "invoice_number",
        ]) ||
        row.Invoice_No ||
        "",
    };
  });
}
