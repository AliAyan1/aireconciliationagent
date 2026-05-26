import * as XLSX from "xlsx";

export function parseExcelFile(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel file has no worksheets.");
  }
  const firstSheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_csv(firstSheet);
}

const HEADER_FIRST_CELL = new Set([
  "date",
  "transaction date",
  "posting date",
  "value date",
]);

function firstCellValue(line: string): string {
  const comma = line.indexOf(",");
  const cell = comma === -1 ? line : line.slice(0, comma);
  return cell.replace(/^"|"$/g, "").trim().toLowerCase();
}

function rowLooksLikeHeader(line: string): boolean {
  const first = firstCellValue(line);
  if (HEADER_FIRST_CELL.has(first)) return true;
  const lower = line.toLowerCase();
  return (
    lower.includes("date") &&
    (lower.includes("description") || lower.includes("amount"))
  );
}

/** Skip Excel title rows before the real header (e.g. "HBL Bank Statement — May 2026"). */
export function skipTitleRowsCsv(csv: string): string {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return csv;

  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (rowLooksLikeHeader(lines[i])) {
      start = i;
      break;
    }
  }

  return lines.slice(start).join("\n");
}
