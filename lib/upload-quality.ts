import {
  applyColumnMapping,
  type ColumnMapping,
} from "./column-mapping";
import {
  getField,
  normalizeDate,
  normalizeDescription,
  parseAmount,
  parseCsvTable,
} from "./normalizer";
import type { BankTransaction, LedgerEntry } from "./types";

export type QualityStatus = "pass" | "warn" | "fail";

export interface QualityCheck {
  status: QualityStatus;
  message: string;
}

export interface DataQualityReport {
  checks: QualityCheck[];
  /** False when the file cannot be used for matching (no rows, parse failure, etc.) */
  canProceed: boolean;
}

export interface ParseWithQualityResult<T> {
  data: T[];
  report: DataQualityReport;
  parseError: string | null;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function isValidIsoDate(value: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function plural(n: number, singular: string, pluralForm?: string): string {
  return n === 1 ? `1 ${singular}` : `${n} ${pluralForm ?? `${singular}s`}`;
}

function buildReport(checks: QualityCheck[]): DataQualityReport {
  const canProceed = !checks.some((c) => c.status === "fail");
  return { checks, canProceed };
}

/** Detect a signed-amount-only bank CSV (no Debit/Credit columns). */
function hasSingleAmountCol(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return (
    lower.includes("amount") &&
    !lower.includes("debit") &&
    !lower.includes("credit")
  );
}

export function parseBankWithQuality(
  csvText: string,
  filename?: string,
  columnMapping?: ColumnMapping
): ParseWithQualityResult<BankTransaction> {
  idCounter = 0;
  const parsed = parseCsvTable(csvText);
  const rows = columnMapping
    ? applyColumnMapping(parsed.data, columnMapping)
    : parsed.data;
  const errors = parsed.errors;

  if (errors.length > 0) {
    return {
      data: [],
      parseError: errors[0].message,
      report: buildReport([
        {
          status: "fail",
          message: `CSV parse error: ${errors[0].message}`,
        },
      ]),
    };
  }

  if (rows.length === 0) {
    const filePart = filename ? ` in ${filename}` : "";
    const msg = `No data rows found${filePart}.`;
    return {
      data: [],
      parseError: msg,
      report: buildReport([{ status: "fail", message: msg }]),
    };
  }

  const headers = Object.keys(rows[0] ?? {});
  const singleAmt = hasSingleAmountCol(headers);

  const transactions: BankTransaction[] = [];
  let emptyDescriptions = 0;
  let invalidDates = 0;
  let invalidAmounts = 0;
  let negativeAmounts = 0;
  let hasSignedAmountColumn = false;

  for (const row of rows) {
    let debit: number | null = null;
    let credit: number | null = null;
    let amount: number;
    let type: "debit" | "credit";

    if (singleAmt) {
      // Signed Amount column: negative → debit, positive → credit
      const raw = parseAmount(
        getField(row, ["amount", "Amount"]) || row.Amount
      );
      if (raw === null) {
        invalidAmounts++;
        continue;
      }
      if (raw < 0) {
        hasSignedAmountColumn = true;
        debit = Math.abs(raw);
        amount = debit;
        type = "debit";
      } else {
        credit = raw;
        amount = credit;
        type = "credit";
      }
    } else {
      const rawDebit = parseAmount(
        getField(row, ["debit", "Debit"]) || row.Debit
      );
      const rawCredit = parseAmount(
        getField(row, ["credit", "Credit"]) || row.Credit
      );

      if (rawDebit === null && rawCredit === null) {
        invalidAmounts++;
        continue;
      }

      // Strip any sign — the column name carries the direction
      debit = rawDebit !== null ? Math.abs(rawDebit) : null;
      credit = rawCredit !== null ? Math.abs(rawCredit) : null;
      amount = debit ?? credit ?? 0;
      type = debit !== null ? "debit" : "credit";
    }

    if (amount < 0) negativeAmounts++;

    const description = getField(row, ["description", "Description"]);
    if (!description.trim()) emptyDescriptions++;

    const date = normalizeDate(
      getField(row, ["date", "Date", "transaction_date", "value_date"]) ||
        row.Date
    );
    if (!isValidIsoDate(date)) invalidDates++;

    transactions.push({
      id: nextId("bank"),
      date: isValidIsoDate(date) ? date : "",
      description: description.trim(),
      normalizedDescription: description.trim()
        ? normalizeDescription(description)
        : "",
      debit,
      credit,
      amount: Math.abs(amount),
      type,
      balance: parseAmount(
        getField(row, ["balance", "Balance", "running_balance"]) ||
          row.Balance
      ),
      reference:
        getField(row, ["reference", "Reference", "ref"]) || row.Reference,
    });
  }

  const rowCount = transactions.length;
  const checks: QualityCheck[] = [];

  if (rowCount === 0) {
    checks.push({
      status: "fail",
      message: "0 rows parsed — no usable transaction rows",
    });
  } else {
    checks.push({ status: "pass", message: `${rowCount} rows parsed` });
  }

  if (hasSignedAmountColumn) {
    checks.push({
      status: "pass",
      message: "Signed Amount column detected — negatives treated as debits",
    });
  }

  if (invalidDates === 0 && rowCount > 0) {
    checks.push({ status: "pass", message: "All dates valid" });
  } else if (invalidDates > 0 && invalidDates < rowCount) {
    checks.push({
      status: "warn",
      message: `${plural(invalidDates, "row")} have invalid or missing dates`,
    });
  } else if (invalidDates > 0 && rowCount > 0) {
    checks.push({
      status: "fail",
      message: "All rows have invalid or missing dates",
    });
  }

  if (invalidAmounts === 0 && rowCount > 0) {
    checks.push({ status: "pass", message: "All amounts are numbers" });
  } else if (invalidAmounts > 0) {
    checks.push({
      status: invalidAmounts >= rows.length ? "fail" : "warn",
      message: `${plural(invalidAmounts, "row")} missing debit/credit amounts`,
    });
  }

  if (emptyDescriptions > 0) {
    checks.push({
      status: "warn",
      message: `${plural(emptyDescriptions, "row")} have empty descriptions`,
    });
  }

  if (negativeAmounts > 0) {
    checks.push({
      status: "warn",
      message: `${plural(negativeAmounts, "row")} have a negative amount`,
    });
  }

  return {
    data: transactions,
    parseError: rowCount === 0 ? "No usable rows after validation." : null,
    report: buildReport(checks),
  };
}

export function parseLedgerWithQuality(
  csvText: string,
  filename?: string,
  columnMapping?: ColumnMapping
): ParseWithQualityResult<LedgerEntry> {
  idCounter = 0;
  const parsed = parseCsvTable(csvText);
  const rows = columnMapping
    ? applyColumnMapping(parsed.data, columnMapping)
    : parsed.data;
  const errors = parsed.errors;

  if (errors.length > 0) {
    return {
      data: [],
      parseError: errors[0].message,
      report: buildReport([
        {
          status: "fail",
          message: `CSV parse error: ${errors[0].message}`,
        },
      ]),
    };
  }

  if (rows.length === 0) {
    const filePart = filename ? ` in ${filename}` : "";
    const msg = `No data rows found${filePart}.`;
    return {
      data: [],
      parseError: msg,
      report: buildReport([{ status: "fail", message: msg }]),
    };
  }

  const entries: LedgerEntry[] = [];
  let emptyDescriptions = 0;
  let invalidDates = 0;
  let invalidAmounts = 0;
  let negativeAmounts = 0;

  for (const row of rows) {
    const rawType = (
      getField(row, ["type", "Type"]) || row.Type || "debit"
    ).toLowerCase();
    const type: "debit" | "credit" = rawType === "credit" ? "credit" : "debit";

    const rawAmount = parseAmount(
      getField(row, ["amount", "Amount"]) || row.Amount
    );

    if (rawAmount === null) {
      invalidAmounts++;
      continue;
    }

    const amount = Math.abs(rawAmount);
    if (rawAmount < 0) negativeAmounts++;

    const description = getField(row, ["description", "Description"]);
    if (!description.trim()) emptyDescriptions++;

    const date = normalizeDate(
      getField(row, ["date", "Date", "transaction_date", "entry_date"]) ||
        row.Date
    );
    if (!isValidIsoDate(date)) invalidDates++;

    entries.push({
      id: nextId("ledger"),
      date: isValidIsoDate(date) ? date : "",
      description: description.trim(),
      normalizedDescription: description.trim()
        ? normalizeDescription(description)
        : "",
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
    });
  }

  const rowCount = entries.length;
  const checks: QualityCheck[] = [];

  if (rowCount === 0) {
    checks.push({
      status: "fail",
      message: "0 rows parsed — no usable transaction rows",
    });
  } else {
    checks.push({ status: "pass", message: `${rowCount} rows parsed` });
  }

  if (invalidDates === 0 && rowCount > 0) {
    checks.push({ status: "pass", message: "All dates valid" });
  } else if (invalidDates > 0 && invalidDates < rowCount) {
    checks.push({
      status: "warn",
      message: `${plural(invalidDates, "row")} have invalid or missing dates`,
    });
  } else if (invalidDates > 0 && rowCount > 0) {
    checks.push({
      status: "fail",
      message: "All rows have invalid or missing dates",
    });
  }

  if (invalidAmounts === 0 && rowCount > 0) {
    checks.push({ status: "pass", message: "All amounts are numbers" });
  } else if (invalidAmounts > 0) {
    checks.push({
      status: invalidAmounts >= rows.length ? "fail" : "warn",
      message: `${plural(invalidAmounts, "row")} have invalid or missing amounts`,
    });
  }

  if (emptyDescriptions > 0) {
    checks.push({
      status: "warn",
      message: `${plural(emptyDescriptions, "row")} have empty descriptions`,
    });
  }

  if (negativeAmounts > 0) {
    checks.push({
      status: "warn",
      message: `${plural(negativeAmounts, "row")} have a negative amount — treated as positive`,
    });
  }

  return {
    data: entries,
    parseError: rowCount === 0 ? "No usable rows after validation." : null,
    report: buildReport(checks),
  };
}
