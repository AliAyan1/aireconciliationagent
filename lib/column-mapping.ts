export type ColumnField =
  | "date"
  | "description"
  | "amount"
  | "debit"
  | "credit"
  | "balance"
  | "reference"
  | "type"
  | "invoiceNo";

export type ColumnMapping = Partial<Record<ColumnField, string>>;

export interface ColumnMappingTemplate {
  id: string;
  name: string;
  source: "bank" | "ledger";
  mapping: ColumnMapping;
}

const TEMPLATES_KEY = "hisaab-column-mapping-templates";

const FIELD_PATTERNS: Record<ColumnField, RegExp[]> = {
  date: [/date/i, /value.?date/i, /posting/i, /txn.?date/i],
  description: [/desc/i, /narration/i, /particular/i, /details/i, /memo/i],
  amount: [/^amount$/i, /amt/i, /value/i],
  debit: [/debit/i, /dr\b/i, /withdrawal/i],
  credit: [/credit/i, /cr\b/i, /deposit/i],
  balance: [/balance/i, /running/i, /closing/i],
  reference: [/ref/i, /cheque/i, /chq/i, /txn.?id/i],
  type: [/^type$/i, /dr.?cr/i],
  invoiceNo: [/invoice/i, /inv.?no/i, /bill/i],
};

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [
    ColumnField,
    RegExp[],
  ][]) {
    const match = headers.find((h) =>
      patterns.some((p) => p.test(h.trim()))
    );
    if (match) mapping[field] = match;
  }
  return mapping;
}

export function applyColumnMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): Record<string, string>[] {
  const canonical: Record<ColumnField, string> = {
    date: "Date",
    description: "Description",
    amount: "Amount",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    reference: "Reference",
    type: "Type",
    invoiceNo: "Invoice_No",
  };

  return rows.map((row) => {
    const out: Record<string, string> = { ...row };
    for (const [field, header] of Object.entries(mapping) as [
      ColumnField,
      string,
    ][]) {
      if (!header || row[header] === undefined) continue;
      out[canonical[field]] = row[header];
    }
    return out;
  });
}

export function loadColumnMappingTemplates(
  source?: "bank" | "ledger"
): ColumnMappingTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const list = raw ? (JSON.parse(raw) as ColumnMappingTemplate[]) : [];
    return source ? list.filter((t) => t.source === source) : list;
  } catch {
    return [];
  }
}

export function saveColumnMappingTemplate(template: ColumnMappingTemplate) {
  const list = loadColumnMappingTemplates().filter((t) => t.id !== template.id);
  list.push(template);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list.slice(-20)));
}
