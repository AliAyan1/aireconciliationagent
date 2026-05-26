import { parseExcelFile, skipTitleRowsCsv } from "./excel";
import { prepareCsvText } from "./normalizer";

const SUPPORTED_EXTENSIONS = new Set(["csv", "txt", "xlsx", "xls"]);

export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

export function isSupportedUploadFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  if (SUPPORTED_EXTENSIONS.has(ext)) return true;
  return (
    file.type === "text/csv" ||
    file.type === "text/plain" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  );
}

export function unsupportedFileMessage(filename: string): string {
  const ext = getFileExtension(filename);
  return ext
    ? `Unsupported file type ".${ext}". Use .csv, .xlsx, or .xls.`
    : "Unsupported file type. Use .csv, .xlsx, or .xls.";
}

/** Read CSV or Excel upload and return CSV text ready for PapaParse. */
export async function readFileAsCsvText(file: File): Promise<string> {
  const ext = getFileExtension(file.name);

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const raw = parseExcelFile(buffer);
    return skipTitleRowsCsv(raw);
  }

  const text = await file.text();
  return skipTitleRowsCsv(prepareCsvText(text));
}
